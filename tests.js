const expect = (actual) => testRunner.expect(actual);

testRunner.describe('🚗 跟驰模型测试 (Car-Following)', [
    {
        id: 'cf1',
        name: 'IDM模型自由流状态验证',
        category: 'carFollowing',
        fn: () => {
            const follower = { position: 0, speed: 30, maxSpeed: 30, length: 4.5 };
            const result = TrafficModels.CarFollowing.IDM(null, follower);
            
            expect(result.acceleration).toBeGreaterThanOrEqual(-0.1);
            expect(result.acceleration).toBeLessThanOrEqual(0.1);
            expect(result.gap).toBe(1000);
        }
    },
    {
        id: 'cf2',
        name: 'IDM模型跟驰状态验证',
        category: 'carFollowing',
        fn: () => {
            const leader = { position: 50, speed: 25, length: 4.5 };
            const follower = { position: 0, speed: 25, maxSpeed: 30, length: 4.5 };
            const result = TrafficModels.CarFollowing.IDM(leader, follower);
            
            expect(result.gap).toBe(45.5);
            expect(result.desiredGap).toBeGreaterThan(0);
            expect(result.acceleration).toBeDefined();
        }
    },
    {
        id: 'cf3',
        name: 'IDM模型紧急制动验证',
        category: 'carFollowing',
        fn: () => {
            const leader = { position: 10, speed: 0, length: 4.5 };
            const follower = { position: 0, speed: 30, maxSpeed: 30, length: 4.5 };
            const result = TrafficModels.CarFollowing.IDM(leader, follower);
            
            expect(result.acceleration).toBeLessThan(0);
            expect(result.gap).toBe(5.5);
        }
    },
    {
        id: 'cf4',
        name: 'Gipps模型期望速度计算',
        category: 'carFollowing',
        fn: () => {
            const leader = { position: 50, speed: 25, length: 4.5 };
            const follower = { position: 0, speed: 25, maxSpeed: 30, maxAcceleration: 2 };
            const result = TrafficModels.CarFollowing.Gipps(leader, follower);
            
            expect(result.desiredSpeed).toBeGreaterThan(0);
            expect(result.desiredSpeed).toBeLessThanOrEqual(30);
            expect(result.safeGap).toBeGreaterThan(0);
        }
    },
    {
        id: 'cf5',
        name: 'OptimalVelocity模型速度计算',
        category: 'carFollowing',
        fn: () => {
            const leader = { position: 50, speed: 25, length: 4.5 };
            const follower = { position: 0, speed: 20, maxSpeed: 30 };
            const result = TrafficModels.CarFollowing.OptimalVelocity(leader, follower);
            
            expect(result.optimalVelocity).toBeGreaterThan(0);
            expect(result.optimalVelocity).toBeLessThanOrEqual(30);
            expect(result.gap).toBe(45.5);
        }
    },
    {
        id: 'cf6',
        name: '三种跟驰模型一致性检验',
        category: 'carFollowing',
        fn: () => {
            const leader = { position: 50, speed: 25, length: 4.5 };
            const follower = { position: 0, speed: 25, maxSpeed: 30, maxAcceleration: 2 };
            
            const idmResult = TrafficModels.CarFollowing.IDM(leader, follower);
            const gippsResult = TrafficModels.CarFollowing.Gipps(leader, follower);
            const ovResult = TrafficModels.CarFollowing.OptimalVelocity(leader, follower);
            
            expect(idmResult.gap).toBe(gippsResult.gap);
            expect(idmResult.acceleration).toBeDefined();
            expect(gippsResult.acceleration).toBeDefined();
            expect(ovResult.acceleration).toBeDefined();
        }
    }
]);

testRunner.describe('⏱️ Webster配时公式验证', [
    {
        id: 'ws1',
        name: 'Webster最佳周期计算验证',
        category: 'webster',
        fn: () => {
            const flows = [500, 400];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4);
            
            expect(result.optimalCycle).toBeGreaterThan(40);
            expect(result.optimalCycle).toBeLessThan(120);
            expect(result.Y).toBeCloseTo(0.5, 1);
        }
    },
    {
        id: 'ws2',
        name: 'Webster绿灯时间分配验证',
        category: 'webster',
        fn: () => {
            const flows = [600, 600];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4);
            
            expect(result.greenTimes[0]).toBeCloseTo(result.greenTimes[1], 0);
            expect(result.greenTimes[0]).toBeGreaterThan(5);
        }
    },
    {
        id: 'ws3',
        name: 'Webster饱和度验证',
        category: 'webster',
        fn: () => {
            const flows = [900, 900];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4);
            
            result.saturationDegrees.forEach(x => {
                expect(x).toBeGreaterThan(0.8);
                expect(x).toBeLessThan(1.2);
            });
        }
    },
    {
        id: 'ws4',
        name: 'Webster周期长度边界验证',
        category: 'webster',
        fn: () => {
            const flows = [100, 100];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4, 30, 120);
            
            expect(result.optimalCycle).toBeGreaterThanOrEqual(30);
            expect(result.optimalCycle).toBeLessThanOrEqual(120);
        }
    },
    {
        id: 'ws5',
        name: 'Webster延误计算验证',
        category: 'webster',
        fn: () => {
            const flows = [500, 400];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4);
            
            expect(result.delays).toHaveLength(2);
            result.delays.forEach(delay => {
                expect(delay).toBeGreaterThan(0);
                expect(delay).toBeLessThan(100);
            });
            expect(result.averageDelay).toBeGreaterThan(0);
        }
    },
    {
        id: 'ws6',
        name: 'Webster vs ARRB vs HCM2010对比',
        category: 'webster',
        fn: () => {
            const flows = [500, 400];
            const saturationFlows = [1800, 1800];
            
            const websterResult = TrafficModels.SignalTiming.Webster(flows, saturationFlows);
            const arrbResult = TrafficModels.SignalTiming.ARRB(flows, saturationFlows);
            const hcmResult = TrafficModels.SignalTiming.HCM2010(flows, saturationFlows);
            
            expect(websterResult.optimalCycle).toBeDefined();
            expect(arrbResult.optimalCycle).toBeDefined();
            expect(hcmResult.optimalCycle).toBeDefined();
            expect(hcmResult.Xc).toBeGreaterThan(0);
        }
    }
]);

testRunner.describe('📊 平均延误计算测试', [
    {
        id: 'dl1',
        name: 'Webster延误公式验证',
        category: 'delay',
        fn: () => {
            const delay = TrafficModels.Delay.Webster(60, 30, 500, 1800);
            expect(delay).toBeGreaterThan(10);
            expect(delay).toBeLessThan(50);
        }
    },
    {
        id: 'dl2',
        name: 'Webster延误随流量增加验证',
        category: 'delay',
        fn: () => {
            const delay1 = TrafficModels.Delay.Webster(60, 30, 300, 1800);
            const delay2 = TrafficModels.Delay.Webster(60, 30, 600, 1800);
            expect(delay2).toBeGreaterThan(delay1);
        }
    },
    {
        id: 'dl3',
        name: 'HCM2010延误分解验证',
        category: 'delay',
        fn: () => {
            const result = TrafficModels.Delay.HCM2010(60, 30, 500, 1800);
            
            expect(result.uniformDelay).toBeGreaterThan(0);
            expect(result.incrementalDelay).toBeGreaterThanOrEqual(0);
            expect(result.totalDelay).toBe(result.uniformDelay + result.incrementalDelay);
            expect(result.vCRatio).toBeGreaterThan(0);
            expect(result.capacity).toBeGreaterThan(0);
        }
    },
    {
        id: 'dl4',
        name: 'HCM2010延误随V/C比变化验证',
        category: 'delay',
        fn: () => {
            const result1 = TrafficModels.Delay.HCM2010(60, 30, 300, 1800);
            const result2 = TrafficModels.Delay.HCM2010(60, 30, 800, 1800);
            
            expect(result2.vCRatio).toBeGreaterThan(result1.vCRatio);
            expect(result2.totalDelay).toBeGreaterThan(result1.totalDelay);
        }
    },
    {
        id: 'dl5',
        name: 'Akcelik延误公式验证',
        category: 'delay',
        fn: () => {
            const delay1 = TrafficModels.Delay.AKCELIK(60, 30, 400, 1800);
            const delay2 = TrafficModels.Delay.AKCELIK(60, 30, 900, 1800);
            
            expect(delay1).toBeGreaterThan(0);
            expect(delay2).toBeGreaterThan(delay1);
        }
    },
    {
        id: 'dl6',
        name: '三种延误公式一致性检验',
        category: 'delay',
        fn: () => {
            const websterDelay = TrafficModels.Delay.Webster(60, 30, 500, 1800);
            const hcmResult = TrafficModels.Delay.HCM2010(60, 30, 500, 1800);
            const akcelikDelay = TrafficModels.Delay.AKCELIK(60, 30, 500, 1800);
            
            expect(websterDelay).toBeGreaterThan(0);
            expect(hcmResult.totalDelay).toBeGreaterThan(0);
            expect(akcelikDelay).toBeGreaterThan(0);
        }
    }
]);

testRunner.describe('🚦 信号灯控制逻辑测试', [
    {
        id: 'sg1',
        name: '相位时长总和验证',
        category: 'signal',
        fn: () => {
            const flows = [500, 400];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4);
            
            const totalGreen = result.greenTimes.reduce((a, b) => a + b, 0);
            const totalCycle = totalGreen + result.totalLostTime;
            
            expect(totalCycle).toBeCloseTo(result.actualCycle, 0);
        }
    },
    {
        id: 'sg2',
        name: '最小绿灯时间保障验证',
        category: 'signal',
        fn: () => {
            const flows = [50, 50];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4);
            
            result.greenTimes.forEach(g => {
                expect(g).toBeGreaterThanOrEqual(5);
            });
        }
    },
    {
        id: 'sg3',
        name: '绿信比总和验证',
        category: 'signal',
        fn: () => {
            const flows = [500, 400];
            const saturationFlows = [1800, 1800];
            const result = TrafficModels.SignalTiming.Webster(flows, saturationFlows, 4);
            
            const totalSplit = result.phaseSplits.reduce((a, b) => a + b, 0);
            expect(totalSplit).toBeGreaterThan(0.7);
            expect(totalSplit).toBeLessThan(1);
        }
    },
    {
        id: 'sg4',
        name: '流量守恒验证',
        category: 'signal',
        fn: () => {
            const result = TrafficModels.Validation.verifyFlowConservation(500, 450, 50, 1);
            expect(result.valid).toBeTruthy();
        }
    },
    {
        id: 'sg5',
        name: '饱和流率验证',
        category: 'signal',
        fn: () => {
            const result = TrafficModels.Validation.verifySaturationFlow(800, 1800, 0.5);
            expect(result.valid).toBeTruthy();
            expect(result.efficiency).toBeLessThan(1);
        }
    },
    {
        id: 'sg6',
        name: '周期一致性验证',
        category: 'signal',
        fn: () => {
            const result = TrafficModels.Validation.verifyCycleConsistency([25, 25], 10, 60);
            expect(result.valid).toBeTruthy();
        }
    }
]);

testRunner.describe('🔀 换道模型测试 (Lane-Changing)', [
    {
        id: 'lc1',
        name: 'MOBIL换道动机验证',
        category: 'laneChange',
        fn: () => {
            const follower = { position: 0, speed: 20, maxSpeed: 30, length: 4.5 };
            const newLeader = { position: 60, speed: 30, length: 4.5 };
            
            const result = TrafficModels.LaneChanging.MOBIL(follower, null, newLeader, {
                politeness: 0,
                accelerationThreshold: 0.1
            });
            
            expect(result.changeLane).toBeTruthy();
            expect(result.incentive).toBeGreaterThan(0);
        }
    },
    {
        id: 'lc2',
        name: 'MOBIL安全约束验证',
        category: 'laneChange',
        fn: () => {
            const follower = { position: 0, speed: 20, maxSpeed: 30, length: 4.5 };
            const newFollower = { position: -20, speed: 25, maxSpeed: 30, length: 4.5 };
            const newLeader = { position: 60, speed: 30, length: 4.5 };
            
            const result = TrafficModels.LaneChanging.MOBIL(follower, newFollower, newLeader, {
                politeness: 0.5,
                accelerationThreshold: 0.1,
                safeDeceleration: -4
            });
            
            expect(result.newFollowerAcceleration).toBeDefined();
        }
    },
    {
        id: 'lc3',
        name: 'MOBIL礼貌因子影响验证',
        category: 'laneChange',
        fn: () => {
            const follower = { position: 0, speed: 20, maxSpeed: 30, length: 4.5 };
            const newFollower = { position: -20, speed: 25, maxSpeed: 30, length: 4.5 };
            const newLeader = { position: 60, speed: 30, length: 4.5 };
            
            const result1 = TrafficModels.LaneChanging.MOBIL(follower, newFollower, newLeader, {
                politeness: 0,
                accelerationThreshold: 0.1
            });
            
            const result2 = TrafficModels.LaneChanging.MOBIL(follower, newFollower, newLeader, {
                politeness: 1,
                accelerationThreshold: 0.1
            });
            
            expect(result1.incentive).toBeGreaterThanOrEqual(result2.incentive);
        }
    },
    {
        id: 'lc4',
        name: 'MOBIL阈值敏感性验证',
        category: 'laneChange',
        fn: () => {
            const follower = { position: 0, speed: 20, maxSpeed: 30, length: 4.5 };
            const newLeader = { position: 60, speed: 30, length: 4.5 };
            
            const result1 = TrafficModels.LaneChanging.MOBIL(follower, null, newLeader, {
                politeness: 0,
                accelerationThreshold: 0.01
            });
            
            const result2 = TrafficModels.LaneChanging.MOBIL(follower, null, newLeader, {
                politeness: 0,
                accelerationThreshold: 10
            });
            
            expect(result1.changeLane).toBeTruthy();
            expect(result2.changeLane).toBeFalsy();
        }
    }
]);

testRunner.describe('📈 基本图与排队模型测试', [
    {
        id: 'fd1',
        name: 'Greenshields基本图验证',
        category: 'carFollowing',
        fn: () => {
            const result1 = TrafficModels.FundamentalDiagram.Greenshields(0);
            const result2 = TrafficModels.FundamentalDiagram.Greenshields(75);
            const result3 = TrafficModels.FundamentalDiagram.Greenshields(150);
            
            expect(result1.speed).toBe(100);
            expect(result1.flow).toBe(0);
            expect(result2.speed).toBe(50);
            expect(result2.flow).toBe(75 * 50);
            expect(result3.speed).toBe(0);
            expect(result3.flow).toBe(0);
        }
    },
    {
        id: 'fd2',
        name: 'Triangular基本图临界密度验证',
        category: 'carFollowing',
        fn: () => {
            const result = TrafficModels.FundamentalDiagram.triangular(19, 100, -15, 150);
            expect(result.speed).toBe(100);
            expect(result.flow).toBe(19 * 100);
        }
    },
    {
        id: 'q1',
        name: '确定性排队模型验证',
        category: 'signal',
        fn: () => {
            const result = TrafficModels.Queue.deterministicQueue(300, 900, 30);
            
            expect(result.clears).toBeTruthy();
            expect(result.maxQueue).toBe(300 * 30);
            expect(result.clearTime).toBe(15);
            expect(result.totalDelay).toBeGreaterThan(0);
        }
    },
    {
        id: 'q2',
        name: '排队溢出条件验证',
        category: 'signal',
        fn: () => {
            const result = TrafficModels.Queue.deterministicQueue(500, 400, 30);
            expect(result.clears).toBeFalsy();
            expect(result.maxQueue).toBe(Infinity);
        }
    },
    {
        id: 'st1',
        name: '交通流稳定性验证',
        category: 'carFollowing',
        fn: () => {
            const speeds = [28, 29, 30, 31, 32, 29, 30, 28, 31, 30];
            const result = TrafficModels.Validation.verifyStability(speeds, 5);
            
            expect(result.stable).toBeTruthy();
            expect(result.meanSpeed).toBeCloseTo(30, 0);
            expect(result.stdDev).toBeLessThan(5);
        }
    }
]);

document.addEventListener('DOMContentLoaded', () => {
    testRunner.createTestItemsUI();
    
    document.getElementById('runAllBtn').addEventListener('click', () => {
        testRunner.runAll();
    });
    
    document.getElementById('exportBtn').addEventListener('click', () => {
        testRunner.exportResults();
    });
});
