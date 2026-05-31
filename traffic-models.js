const TrafficModels = {
    CarFollowing: {
        Gipps: function(leader, follower, params = {}) {
            const {
                maxDeceleration = -8,
                reactionTime = 1.5,
                safeTimeHeadway = 2,
                minGap = 2
            } = params;
            
            const gap = leader.position - follower.position - leader.length;
            const leaderSpeed = leader.speed;
            const followerSpeed = follower.speed;
            
            const accelerationTerm = 2.5 * follower.maxAcceleration * reactionTime;
            const speedTerm = followerSpeed * (1 + 0.025 * Math.sqrt(followerSpeed / follower.maxSpeed));
            
            const brakeDistance = (leaderSpeed * leaderSpeed) / (2 * Math.abs(maxDeceleration));
            const currentBrakeDistance = (followerSpeed * followerSpeed) / (2 * Math.abs(maxDeceleration));
            
            const decelerationTerm = maxDeceleration * reactionTime + 
                Math.sqrt(Math.max(0, maxDeceleration * maxDeceleration * reactionTime * reactionTime + 
                2 * maxDeceleration * (gap - minGap - brakeDistance + currentBrakeDistance)));
            
            const desiredSpeed = Math.min(follower.maxSpeed, Math.min(accelerationTerm + speedTerm, decelerationTerm));
            
            return {
                desiredSpeed: Math.max(0, desiredSpeed),
                gap: gap,
                safeGap: minGap + safeTimeHeadway * followerSpeed,
                acceleration: (desiredSpeed - followerSpeed) / reactionTime
            };
        },
        
        IDM: function(leader, follower, params = {}) {
            const {
                desiredTimeHeadway = 1.5,
                minGap = 2,
                maxAcceleration = 2,
                comfortableDeceleration = 4,
                exponent = 4
            } = params;
            
            const gap = leader ? leader.position - follower.position - leader.length : 1000;
            const speedDiff = follower.speed - (leader ? leader.speed : 0);
            
            const sStar = minGap + Math.max(0, follower.speed * desiredTimeHeadway + 
                (follower.speed * speedDiff) / (2 * Math.sqrt(maxAcceleration * comfortableDeceleration)));
            
            const freeRoadTerm = Math.pow(follower.speed / follower.maxSpeed, exponent);
            const interactionTerm = gap > 0 ? Math.pow(sStar / gap, 2) : 1000;
            
            const acceleration = maxAcceleration * (1 - freeRoadTerm - interactionTerm);
            
            return {
                acceleration: Math.max(-comfortableDeceleration, Math.min(maxAcceleration, acceleration)),
                gap: gap,
                desiredGap: sStar,
                freeRoadTerm: freeRoadTerm,
                interactionTerm: interactionTerm
            };
        },
        
        OptimalVelocity: function(leader, follower, params = {}) {
            const {
                maxSpeed = 30,
                minGap = 2,
                sensitivity = 0.5,
                transitionWidth = 10
            } = params;
            
            const gap = leader ? leader.position - follower.position - leader.length : 1000;
            
            const optimalVelocity = maxSpeed / 2 * (Math.tanh((gap - minGap) / transitionWidth - 1.7) + Math.tanh(1.7));
            
            const acceleration = sensitivity * (Math.max(0, optimalVelocity) - follower.speed);
            
            return {
                optimalVelocity: Math.max(0, optimalVelocity),
                acceleration: acceleration,
                gap: gap
            };
        }
    },
    
    LaneChanging: {
        MOBIL: function(follower, newFollower, newLeader, params = {}) {
            const {
                politeness = 0.1,
                accelerationThreshold = 0.2,
                safeDeceleration = -4
            } = params;
            
            const oldAcc = TrafficModels.CarFollowing.IDM(
                { position: follower.position + 50, speed: 30, length: 4.5 },
                follower
            ).acceleration;
            
            const newAcc = TrafficModels.CarFollowing.IDM(newLeader, follower).acceleration;
            
            const newFollowerOldAcc = newFollower ? TrafficModels.CarFollowing.IDM(
                { position: newFollower.position + 50, speed: 30, length: 4.5 },
                newFollower
            ).acceleration : 0;
            
            const newFollowerNewAcc = newFollower ? TrafficModels.CarFollowing.IDM(follower, newFollower).acceleration : 0;
            
            const followerAdvantage = newAcc - oldAcc;
            const followerDisadvantage = newFollowerOldAcc - newFollowerNewAcc;
            
            const incentive = followerAdvantage - politeness * followerDisadvantage;
            
            const changeLane = incentive > accelerationThreshold && 
                (!newFollower || newFollowerNewAcc >= safeDeceleration);
            
            return {
                changeLane: changeLane,
                incentive: incentive,
                followerAdvantage: followerAdvantage,
                followerDisadvantage: followerDisadvantage,
                newFollowerAcceleration: newFollowerNewAcc
            };
        }
    },
    
    SignalTiming: {
        Webster: function(flows, saturationFlows, lostTimePerPhase = 4, minCycle = 30, maxCycle = 120) {
            const nPhases = flows.length;
            const Y = flows.reduce((sum, q, i) => sum + (q / saturationFlows[i]), 0);
            
            const L = nPhases * lostTimePerPhase;
            
            let C0 = (1.5 * L + 5) / (1 - Y);
            C0 = Math.max(minCycle, Math.min(maxCycle, C0));
            
            const greenTimes = flows.map((q, i) => {
                const lambda = (q / saturationFlows[i]) / Y;
                const g = lambda * (C0 - L);
                return Math.max(5, g);
            });
            
            const effectiveGreen = greenTimes.reduce((a, b) => a + b, 0);
            const actualCycle = effectiveGreen + L;
            
            const delays = flows.map((q, i) => {
                const lambda = greenTimes[i] / actualCycle;
                const x = q / (saturationFlows[i] * lambda);
                return TrafficModels.Delay.Webster(actualCycle, greenTimes[i], q, saturationFlows[i], x);
            });
            
            const totalDelay = delays.reduce((a, b) => a + b, 0);
            const averageDelay = totalDelay / flows.length;
            
            return {
                optimalCycle: C0,
                actualCycle: actualCycle,
                greenTimes: greenTimes,
                phaseSplits: greenTimes.map(g => g / actualCycle),
                Y: Y,
                totalLostTime: L,
                delays: delays,
                averageDelay: averageDelay,
                saturationDegrees: flows.map((q, i) => q / (saturationFlows[i] * (greenTimes[i] / actualCycle)))
            };
        },
        
        ARRB: function(flows, saturationFlows, lostTimePerPhase = 4) {
            const nPhases = flows.length;
            const Y = flows.reduce((sum, q, i) => sum + (q / saturationFlows[i]), 0);
            const L = nPhases * lostTimePerPhase;
            
            const V = flows.reduce((a, b) => a + b, 0);
            
            let C0 = (0.9 * L + 6) / (1 - Y);
            C0 = Math.max(40, Math.min(200, C0));
            
            const greenTimes = flows.map((q, i) => {
                const lambda = (q / saturationFlows[i]) / Y;
                const g = lambda * (C0 - L);
                return Math.max(7, g);
            });
            
            return {
                optimalCycle: C0,
                greenTimes: greenTimes,
                Y: Y,
                totalFlow: V
            };
        },
        
        HCM2010: function(flows, saturationFlows, lostTimePerPhase = 3.5) {
            const nPhases = flows.length;
            const vCrit = flows.map((q, i) => q / saturationFlows[i]);
            const Xc = Math.max(...vCrit);
            
            const L = nPhases * lostTimePerPhase;
            
            let C = (L * Xc) / (Xc - (1 - 0.001 * nPhases));
            C = Math.max(40, Math.min(240, C));
            
            const greenTimes = vCrit.map(v => {
                const g = (v / Xc) * (C - L);
                return Math.max(5, g);
            });
            
            return {
                optimalCycle: C,
                greenTimes: greenTimes,
                criticalVC: vCrit,
                Xc: Xc,
                phaseSplits: greenTimes.map(g => g / C)
            };
        }
    },
    
    Delay: {
        Webster: function(cycleLength, greenTime, flow, saturationFlow, x = null) {
            const lambda = greenTime / cycleLength;
            const saturation = x !== null ? x : flow / (saturationFlow * lambda);
            const X = Math.min(0.99, Math.max(0.01, saturation));
            
            const d1 = (cycleLength * Math.pow(1 - lambda, 2)) / (2 * (1 - lambda * X));
            const d2 = 900 * X * ((X - 1) + Math.sqrt(Math.pow(X - 1, 2) + 8 * X * 0.5 / saturationFlow));
            
            const randomDelay = 0;
            const initialQueueDelay = 0;
            
            return d1 + d2 + randomDelay + initialQueueDelay;
        },
        
        HCM2010: function(cycleLength, greenTime, flow, saturationFlow, t = 0.25, X = null, PF = 1) {
            const lambda = greenTime / cycleLength;
            const Xcalc = X !== null ? X : flow / (saturationFlow * lambda);
            const c = saturationFlow * lambda;
            
            const T = 0.25;
            
            const d1 = (0.5 * cycleLength * Math.pow(1 - lambda, 2)) / (1 - Math.min(lambda, Xcalc) * lambda) * PF;
            
            const term1 = 900 * T;
            const term2 = (Xcalc - 1);
            const term3 = Math.sqrt(Math.pow(Xcalc - 1, 2) + (8 * Xcalc * 0.5) / (c * T));
            const d2 = term1 * (term2 + term3);
            
            const d3 = 0;
            
            const totalDelay = d1 + d2 + d3;
            
            return {
                uniformDelay: d1,
                incrementalDelay: d2,
                initialQueueDelay: d3,
                totalDelay: totalDelay,
                capacity: c,
                vCRatio: Xcalc
            };
        },
        
        AKCELIK: function(cycleLength, greenTime, flow, saturationFlow) {
            const lambda = greenTime / cycleLength;
            const c = saturationFlow * lambda;
            const X = flow / c;
            
            const a = 0.5 * cycleLength * Math.pow(1 - lambda, 2) / (1 - lambda * X);
            const b = X >= 1 ? 900 * (X - 1 + Math.sqrt(Math.pow(X - 1, 2) + 12 * X / (c * 0.25))) : 0;
            
            return a + b;
        }
    },
    
    Queue: {
        deterministicQueue: function(arrivalRate, departureRate, duration) {
            const netRate = departureRate - arrivalRate;
            
            if (netRate <= 0) {
                return {
                    maxQueue: Infinity,
                    finalQueue: Infinity,
                    totalDelay: Infinity,
                    clears: false
                };
            }
            
            const maxQueue = arrivalRate * duration;
            const clearTime = maxQueue / netRate;
            const totalDelay = 0.5 * maxQueue * (duration + clearTime);
            
            return {
                maxQueue: maxQueue,
                finalQueue: 0,
                totalDelay: totalDelay,
                clearTime: clearTime,
                clears: true
            };
        },
        
        timeDependentQueue: function(arrivalProfile, departureRate, timeStep = 1) {
            let queue = 0;
            let maxQueue = 0;
            let totalDelay = 0;
            const queueProfile = [];
            
            for (let t = 0; t < arrivalProfile.length; t++) {
                queue += arrivalProfile[t] * timeStep;
                const departed = Math.min(queue, departureRate * timeStep);
                queue -= departed;
                totalDelay += queue * timeStep;
                maxQueue = Math.max(maxQueue, queue);
                queueProfile.push({ time: t, queue: queue });
            }
            
            return {
                maxQueue: maxQueue,
                finalQueue: queue,
                totalDelay: totalDelay,
                queueProfile: queueProfile
            };
        }
    },
    
    FundamentalDiagram: {
        Greenshields: function(density, jamDensity = 150, freeFlowSpeed = 100) {
            const speed = freeFlowSpeed * (1 - density / jamDensity);
            const flow = density * speed;
            return {
                speed: Math.max(0, speed),
                flow: Math.max(0, flow),
                density: density
            };
        },
        
        Greenberg: function(density, jamDensity = 150, optimalSpeed = 80) {
            const criticalDensity = jamDensity / Math.exp(1);
            const speed = optimalSpeed * Math.log(jamDensity / density);
            const flow = density * speed;
            return {
                speed: Math.max(0, speed),
                flow: Math.max(0, flow),
                criticalDensity: criticalDensity,
                maxFlow: criticalDensity * optimalSpeed
            };
        },
        
        Underwood: function(density, jamDensity = 150, freeFlowSpeed = 110) {
            const criticalDensity = jamDensity / 4;
            const speed = freeFlowSpeed * Math.exp(-density / criticalDensity);
            const flow = density * speed;
            return {
                speed: speed,
                flow: flow,
                criticalDensity: criticalDensity,
                maxFlow: (freeFlowSpeed * criticalDensity) / Math.exp(1)
            };
        },
        
        triangular: function(density, freeFlowSpeed = 100, waveSpeed = -15, jamDensity = 150) {
            const criticalDensity = Math.abs(waveSpeed) * jamDensity / (freeFlowSpeed + Math.abs(waveSpeed));
            let speed, flow;
            
            if (density <= criticalDensity) {
                speed = freeFlowSpeed;
                flow = density * freeFlowSpeed;
            } else {
                flow = Math.abs(waveSpeed) * (jamDensity - density);
                speed = density > 0 ? flow / density : 0;
            }
            
            return {
                speed: Math.max(0, speed),
                flow: Math.max(0, flow),
                criticalDensity: criticalDensity,
                maxFlow: criticalDensity * freeFlowSpeed,
                jamDensity: jamDensity
            };
        }
    },
    
    Validation: {
        verifyFlowConservation: function(flowIn, flowOut, queueChange, tolerance = 0.01) {
            const conservation = flowIn - flowOut - queueChange;
            return {
                valid: Math.abs(conservation) < tolerance,
                error: conservation,
                flowIn: flowIn,
                flowOut: flowOut,
                queueChange: queueChange
            };
        },
        
        verifySaturationFlow: function(departureRate, saturationFlow, greenRatio, tolerance = 0.1) {
            const expectedMax = saturationFlow * greenRatio;
            return {
                valid: departureRate <= expectedMax * (1 + tolerance),
                departureRate: departureRate,
                expectedMax: expectedMax,
                efficiency: departureRate / expectedMax
            };
        },
        
        verifyCycleConsistency: function(greenTimes, lostTime, cycleLength, tolerance = 0.5) {
            const totalGreen = greenTimes.reduce((a, b) => a + b, 0);
            const calculatedCycle = totalGreen + lostTime;
            return {
                valid: Math.abs(calculatedCycle - cycleLength) < tolerance,
                totalGreen: totalGreen,
                lostTime: lostTime,
                calculatedCycle: calculatedCycle,
                expectedCycle: cycleLength
            };
        },
        
        verifyStability: function(speeds, threshold = 20) {
            const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
            const variance = speeds.reduce((sum, s) => sum + Math.pow(s - meanSpeed, 2), 0) / speeds.length;
            const stdDev = Math.sqrt(variance);
            
            return {
                stable: stdDev < threshold,
                meanSpeed: meanSpeed,
                stdDev: stdDev,
                minSpeed: Math.min(...speeds),
                maxSpeed: Math.max(...speeds)
            };
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrafficModels;
}
