class TrafficSimulation {
    constructor() {
        this.canvas = document.getElementById('trafficCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        
        this.signalMode = 'fixed';
        this.busPriorityEnabled = false;
        this.pedestrianEnabled = false;
        
        this.cycleLength = 60;
        this.nsGreenRatio = 0.5;
        this.ewGreenRatio = 0.5;
        this.nsFlowRate = 5;
        this.ewFlowRate = 5;
        this.busRatio = 0.1;
        
        this.minGreenTime = 10;
        this.detectionDistance = 100;
        this.waveSpeed = 40;
        this.bandwidth = 0.3;
        
        this.pedFlowRate = 3;
        this.pedCrossTime = 15;
        
        this.cars = [];
        this.pedestrians = [];
        this.carIdCounter = 0;
        this.pedIdCounter = 0;
        
        this.currentPhase = 0;
        this.phaseTimer = 0;
        this.totalThroughput = 0;
        this.totalWaitTime = 0;
        this.carsProcessed = 0;
        this.maxQueueLength = 0;
        
        this.busThroughput = 0;
        this.pedThroughput = 0;
        
        this.roadWidth = 100;
        this.laneWidth = 50;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        this.trafficLights = {
            north: 'red',
            south: 'red',
            east: 'red',
            west: 'red'
        };
        
        this.pedLights = {
            ns: 'red',
            ew: 'red'
        };
        
        this.schemes = JSON.parse(localStorage.getItem('trafficSchemes') || '[]');
        this.importedData = null;
        
        this.initEventListeners();
        this.draw();
        this.updateSchemeList();
    }
    
    initEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        document.querySelectorAll('input[name="signalMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.signalMode = e.target.value;
                this.updateModeOptions();
            });
        });
        
        document.getElementById('busPriority').addEventListener('change', (e) => {
            this.busPriorityEnabled = e.target.checked;
        });
        
        document.getElementById('pedestrianEnabled').addEventListener('change', (e) => {
            this.pedestrianEnabled = e.target.checked;
            document.getElementById('pedestrianSection').classList.toggle('hidden', !this.pedestrianEnabled);
        });
        
        document.getElementById('cycleSlider').addEventListener('input', (e) => {
            this.cycleLength = parseInt(e.target.value);
            document.getElementById('cycleValue').textContent = this.cycleLength;
            document.getElementById('cycleDisplay').textContent = this.cycleLength + 's';
        });
        
        document.getElementById('nsGreenSlider').addEventListener('input', (e) => {
            this.nsGreenRatio = parseInt(e.target.value) / 100;
            document.getElementById('nsGreenValue').textContent = e.target.value;
        });
        
        document.getElementById('ewGreenSlider').addEventListener('input', (e) => {
            this.ewGreenRatio = parseInt(e.target.value) / 100;
            document.getElementById('ewGreenValue').textContent = e.target.value;
        });
        
        document.getElementById('nsFlowSlider').addEventListener('input', (e) => {
            this.nsFlowRate = parseInt(e.target.value);
            document.getElementById('nsFlowValue').textContent = this.nsFlowRate;
        });
        
        document.getElementById('ewFlowSlider').addEventListener('input', (e) => {
            this.ewFlowRate = parseInt(e.target.value);
            document.getElementById('ewFlowValue').textContent = this.ewFlowRate;
        });
        
        document.getElementById('busRatioSlider').addEventListener('input', (e) => {
            this.busRatio = parseInt(e.target.value) / 100;
            document.getElementById('busRatioValue').textContent = e.target.value;
        });
        
        document.getElementById('minGreenSlider').addEventListener('input', (e) => {
            this.minGreenTime = parseInt(e.target.value);
            document.getElementById('minGreenValue').textContent = this.minGreenTime;
        });
        
        document.getElementById('detectionSlider').addEventListener('input', (e) => {
            this.detectionDistance = parseInt(e.target.value);
            document.getElementById('detectionValue').textContent = this.detectionDistance;
        });
        
        document.getElementById('waveSpeedSlider').addEventListener('input', (e) => {
            this.waveSpeed = parseInt(e.target.value);
            document.getElementById('waveSpeedValue').textContent = this.waveSpeed;
        });
        
        document.getElementById('bandwidthSlider').addEventListener('input', (e) => {
            this.bandwidth = parseInt(e.target.value) / 100;
            document.getElementById('bandwidthValue').textContent = e.target.value;
        });
        
        document.getElementById('pedFlowSlider').addEventListener('input', (e) => {
            this.pedFlowRate = parseInt(e.target.value);
            document.getElementById('pedFlowValue').textContent = this.pedFlowRate;
        });
        
        document.getElementById('pedCrossTimeSlider').addEventListener('input', (e) => {
            this.pedCrossTime = parseInt(e.target.value);
            document.getElementById('pedCrossTimeValue').textContent = this.pedCrossTime;
        });
        
        document.getElementById('saveSchemeBtn').addEventListener('click', () => this.saveScheme());
        document.getElementById('loadSchemeBtn').addEventListener('click', () => this.loadBestScheme());
        
        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('dataFileInput').click();
        });
        
        document.getElementById('dataFileInput').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });
        
        document.getElementById('compareBtn').addEventListener('click', () => this.showComparison());
    }
    
    updateModeOptions() {
        document.getElementById('actuatedOptions').classList.toggle('hidden', this.signalMode !== 'actuated');
        document.getElementById('greenWaveOptions').classList.toggle('hidden', this.signalMode !== 'greenWave');
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
            document.getElementById('startBtn').textContent = '运行中...';
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? '继续' : '暂停';
        if (!this.isPaused && this.isRunning) {
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.cars = [];
        this.pedestrians = [];
        this.currentPhase = 0;
        this.phaseTimer = 0;
        this.totalThroughput = 0;
        this.totalWaitTime = 0;
        this.carsProcessed = 0;
        this.maxQueueLength = 0;
        this.busThroughput = 0;
        this.pedThroughput = 0;
        this.updateStats();
        this.draw();
        document.getElementById('startBtn').textContent = '开始模拟';
        document.getElementById('pauseBtn').textContent = '暂停';
    }
    
    gameLoop(currentTime) {
        if (!this.isRunning || this.isPaused) return;
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.updateTrafficLights(deltaTime);
        this.spawnCars(deltaTime);
        if (this.pedestrianEnabled) {
            this.spawnPedestrians(deltaTime);
            this.updatePedestrians(deltaTime);
        }
        this.updateCars(deltaTime);
        this.updateStats();
    }
    
    updateTrafficLights(deltaTime) {
        this.phaseTimer += deltaTime;
        
        if (this.signalMode === 'fixed') {
            this.updateFixedTiming();
        } else if (this.signalMode === 'actuated') {
            this.updateActuatedTiming(deltaTime);
        } else if (this.signalMode === 'greenWave') {
            this.updateGreenWaveTiming();
        }
    }
    
    updateFixedTiming() {
        const nsGreenTime = this.cycleLength * this.nsGreenRatio;
        const ewGreenTime = this.cycleLength * this.ewGreenRatio;
        const yellowTime = 3;
        const allRedTime = 2;
        
        let phaseTime = this.phaseTimer % (nsGreenTime + ewGreenTime + yellowTime * 2 + allRedTime * 2);
        
        if (phaseTime < nsGreenTime) {
            this.trafficLights.north = 'green';
            this.trafficLights.south = 'green';
            this.trafficLights.east = 'red';
            this.trafficLights.west = 'red';
            if (this.pedestrianEnabled) {
                this.pedLights.ns = 'green';
                this.pedLights.ew = 'red';
            }
        } else if (phaseTime < nsGreenTime + yellowTime) {
            this.trafficLights.north = 'yellow';
            this.trafficLights.south = 'yellow';
            this.trafficLights.east = 'red';
            this.trafficLights.west = 'red';
            if (this.pedestrianEnabled) {
                this.pedLights.ns = 'flashing';
                this.pedLights.ew = 'red';
            }
        } else if (phaseTime < nsGreenTime + yellowTime + allRedTime) {
            this.trafficLights.north = 'red';
            this.trafficLights.south = 'red';
            this.trafficLights.east = 'red';
            this.trafficLights.west = 'red';
            if (this.pedestrianEnabled) {
                this.pedLights.ns = 'red';
                this.pedLights.ew = 'red';
            }
        } else if (phaseTime < nsGreenTime + yellowTime + allRedTime + ewGreenTime) {
            this.trafficLights.north = 'red';
            this.trafficLights.south = 'red';
            this.trafficLights.east = 'green';
            this.trafficLights.west = 'green';
            if (this.pedestrianEnabled) {
                this.pedLights.ns = 'red';
                this.pedLights.ew = 'green';
            }
        } else if (phaseTime < nsGreenTime + yellowTime + allRedTime + ewGreenTime + yellowTime) {
            this.trafficLights.north = 'red';
            this.trafficLights.south = 'red';
            this.trafficLights.east = 'yellow';
            this.trafficLights.west = 'yellow';
            if (this.pedestrianEnabled) {
                this.pedLights.ns = 'red';
                this.pedLights.ew = 'flashing';
            }
        } else {
            this.trafficLights.north = 'red';
            this.trafficLights.south = 'red';
            this.trafficLights.east = 'red';
            this.trafficLights.west = 'red';
            if (this.pedestrianEnabled) {
                this.pedLights.ns = 'red';
                this.pedLights.ew = 'red';
            }
        }
    }
    
    updateActuatedTiming(deltaTime) {
        const yellowTime = 3;
        const allRedTime = 2;
        
        const nsQueue = this.getQueueLength('north') + this.getQueueLength('south');
        const ewQueue = this.getQueueLength('east') + this.getQueueLength('west');
        
        const hasBusInNS = this.hasBusWaiting('north') || this.hasBusWaiting('south');
        const hasBusInEW = this.hasBusWaiting('east') || this.hasBusWaiting('west');
        
        const nsGreenTime = Math.max(this.minGreenTime, this.cycleLength * this.nsGreenRatio);
        const ewGreenTime = Math.max(this.minGreenTime, this.cycleLength * this.ewGreenRatio);
        
        const totalCycle = nsGreenTime + ewGreenTime + yellowTime * 2 + allRedTime * 2;
        let phaseTime = this.phaseTimer % totalCycle;
        
        let extendedGreen = 0;
        if (this.busPriorityEnabled) {
            if (this.currentPhase === 0 && hasBusInNS) extendedGreen = 5;
            if (this.currentPhase === 1 && hasBusInEW) extendedGreen = 5;
        }
        
        if (this.currentPhase === 0) {
            if (phaseTime < nsGreenTime + extendedGreen) {
                this.trafficLights.north = 'green';
                this.trafficLights.south = 'green';
                this.trafficLights.east = 'red';
                this.trafficLights.west = 'red';
            } else if (phaseTime < nsGreenTime + extendedGreen + yellowTime) {
                this.trafficLights.north = 'yellow';
                this.trafficLights.south = 'yellow';
                this.trafficLights.east = 'red';
                this.trafficLights.west = 'red';
            } else {
                this.currentPhase = 1;
            }
        } else {
            const ewStart = nsGreenTime + extendedGreen + yellowTime + allRedTime;
            if (phaseTime < ewStart) {
                this.trafficLights.north = 'red';
                this.trafficLights.south = 'red';
                this.trafficLights.east = 'red';
                this.trafficLights.west = 'red';
            } else if (phaseTime < ewStart + ewGreenTime + extendedGreen) {
                this.trafficLights.north = 'red';
                this.trafficLights.south = 'red';
                this.trafficLights.east = 'green';
                this.trafficLights.west = 'green';
            } else if (phaseTime < ewStart + ewGreenTime + extendedGreen + yellowTime) {
                this.trafficLights.north = 'red';
                this.trafficLights.south = 'red';
                this.trafficLights.east = 'yellow';
                this.trafficLights.west = 'yellow';
            } else {
                this.currentPhase = 0;
                this.phaseTimer = 0;
            }
        }
        
        if (this.pedestrianEnabled) {
            this.pedLights.ns = this.trafficLights.north === 'green' ? 'green' : 'red';
            this.pedLights.ew = this.trafficLights.east === 'green' ? 'green' : 'red';
        }
    }
    
    updateGreenWaveTiming() {
        const cycleTime = this.cycleLength;
        const bandwidthTime = cycleTime * this.bandwidth;
        const offset = 0;
        
        let normalizedTime = (this.phaseTimer + offset) % cycleTime;
        
        const greenStartTime = 0;
        const greenEndTime = cycleTime * this.nsGreenRatio + bandwidthTime;
        
        if (normalizedTime >= greenStartTime && normalizedTime < greenEndTime - 3) {
            this.trafficLights.north = 'green';
            this.trafficLights.south = 'green';
            this.trafficLights.east = 'red';
            this.trafficLights.west = 'red';
        } else if (normalizedTime < greenEndTime) {
            this.trafficLights.north = 'yellow';
            this.trafficLights.south = 'yellow';
            this.trafficLights.east = 'red';
            this.trafficLights.west = 'red';
        } else if (normalizedTime < cycleTime - 3) {
            this.trafficLights.north = 'red';
            this.trafficLights.south = 'red';
            this.trafficLights.east = 'green';
            this.trafficLights.west = 'green';
        } else {
            this.trafficLights.north = 'red';
            this.trafficLights.south = 'red';
            this.trafficLights.east = 'yellow';
            this.trafficLights.west = 'yellow';
        }
        
        if (this.pedestrianEnabled) {
            this.pedLights.ns = this.trafficLights.north === 'green' ? 'green' : 'red';
            this.pedLights.ew = this.trafficLights.east === 'green' ? 'green' : 'red';
        }
    }
    
    getQueueLength(direction) {
        return this.cars.filter(car => car.direction === direction && car.isWaiting).length;
    }
    
    hasBusWaiting(direction) {
        return this.cars.some(car => car.direction === direction && car.isBus && car.isWaiting);
    }
    
    spawnCars(deltaTime) {
        const directions = ['north', 'south', 'east', 'west'];
        
        directions.forEach((dir) => {
            const rate = (dir === 'north' || dir === 'south') ? this.nsFlowRate : this.ewFlowRate;
            const spawnProbability = rate * deltaTime;
            
            if (Math.random() < spawnProbability / 4) {
                this.spawnCar(dir);
            }
        });
    }
    
    spawnCar(direction) {
        const isBus = Math.random() < this.busRatio;
        
        const car = {
            id: this.carIdCounter++,
            direction: direction,
            x: 0,
            y: 0,
            speed: 0,
            maxSpeed: isBus ? 60 : 80,
            acceleration: isBus ? 30 : 50,
            deceleration: isBus ? 60 : 100,
            width: isBus ? 50 : 30,
            height: isBus ? 25 : 20,
            waitTime: 0,
            isWaiting: false,
            hasPassedIntersection: false,
            isBus: isBus,
            color: isBus ? '#16a34a' : this.getRandomColor()
        };
        
        switch (direction) {
            case 'north':
                car.x = this.centerX + this.laneWidth / 2 - car.width / 2;
                car.y = this.canvas.height;
                car.vx = 0;
                car.vy = -1;
                break;
            case 'south':
                car.x = this.centerX - this.laneWidth / 2 - car.width / 2;
                car.y = -car.height;
                car.vx = 0;
                car.vy = 1;
                break;
            case 'east':
                car.x = -car.width;
                car.y = this.centerY - this.laneWidth / 2 - car.height / 2;
                car.vx = 1;
                car.vy = 0;
                break;
            case 'west':
                car.x = this.canvas.width;
                car.y = this.centerY + this.laneWidth / 2 - car.height / 2;
                car.vx = -1;
                car.vy = 0;
                break;
        }
        
        this.cars.push(car);
    }
    
    getRandomColor() {
        const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    updateCars(deltaTime) {
        const carsToRemove = [];
        
        this.cars.forEach((car, index) => {
            const stopDistance = car.isBus ? 60 : 50;
            const distanceToStop = this.getDistanceToStop(car);
            const distanceToFrontCar = this.getDistanceToFrontCar(car);
            
            const minStopDistance = Math.min(distanceToStop, distanceToFrontCar);
            const actualStopDistance = Math.min(stopDistance, distanceToFrontCar - 5);
            
            const shouldStopForLight = distanceToStop < stopDistance && !this.canPass(car);
            const shouldStopForCar = distanceToFrontCar < stopDistance + 10;
            
            if (shouldStopForLight || shouldStopForCar) {
                car.speed = Math.max(0, car.speed - car.deceleration * deltaTime);
                car.isWaiting = car.speed < 5;
                if (car.isWaiting) {
                    car.waitTime += deltaTime;
                }
            } else {
                car.speed = Math.min(car.maxSpeed, car.speed + car.acceleration * deltaTime);
                car.isWaiting = false;
            }
            
            car.x += car.vx * car.speed * deltaTime;
            car.y += car.vy * car.speed * deltaTime;
            
            if (!car.hasPassedIntersection && this.hasPassedIntersection(car)) {
                car.hasPassedIntersection = true;
                this.totalThroughput++;
                this.totalWaitTime += car.waitTime;
                this.carsProcessed++;
                if (car.isBus) {
                    this.busThroughput++;
                }
            }
            
            if (car.x < -100 || car.x > this.canvas.width + 100 ||
                car.y < -100 || car.y > this.canvas.height + 100) {
                carsToRemove.push(index);
            }
        });
        
        for (let i = carsToRemove.length - 1; i >= 0; i--) {
            this.cars.splice(carsToRemove[i], 1);
        }
        
        const currentQueue = this.cars.filter(car => car.isWaiting).length;
        this.maxQueueLength = Math.max(this.maxQueueLength, currentQueue);
    }
    
    getDistanceToFrontCar(car) {
        let minDistance = Infinity;
        
        this.cars.forEach(otherCar => {
            if (otherCar === car) return;
            if (otherCar.direction !== car.direction) return;
            
            let distance;
            switch (car.direction) {
                case 'north':
                    if (otherCar.y < car.y) {
                        distance = car.y - otherCar.y - otherCar.height;
                    }
                    break;
                case 'south':
                    if (otherCar.y > car.y) {
                        distance = otherCar.y - car.y - car.height;
                    }
                    break;
                case 'east':
                    if (otherCar.x > car.x) {
                        distance = otherCar.x - car.x - car.width;
                    }
                    break;
                case 'west':
                    if (otherCar.x < car.x) {
                        distance = car.x - otherCar.x - otherCar.width;
                    }
                    break;
            }
            
            if (distance !== undefined && distance >= 0 && distance < minDistance) {
                minDistance = distance;
            }
        });
        
        return minDistance;
    }
    
    getDistanceToStop(car) {
        const stopLine = this.getStopLinePosition(car.direction);
        
        switch (car.direction) {
            case 'north':
                return car.y - stopLine;
            case 'south':
                return stopLine - car.y;
            case 'east':
                return stopLine - car.x;
            case 'west':
                return car.x - stopLine;
            default:
                return 1000;
        }
    }
    
    getStopLinePosition(direction) {
        switch (direction) {
            case 'north':
                return this.centerY + this.roadWidth / 2;
            case 'south':
                return this.centerY - this.roadWidth / 2;
            case 'east':
                return this.centerX - this.roadWidth / 2;
            case 'west':
                return this.centerX + this.roadWidth / 2;
            default:
                return 0;
        }
    }
    
    canPass(car) {
        const lightColor = this.trafficLights[car.direction];
        
        if (lightColor === 'green') {
            return true;
        }
        
        if (lightColor === 'yellow') {
            const distanceToStop = this.getDistanceToStop(car);
            const stopDistance = car.isBus ? 60 : 50;
            const decelDistance = (car.speed * car.speed) / (2 * car.deceleration);
            
            if (distanceToStop < stopDistance) {
                return true;
            }
            
            if (decelDistance < distanceToStop - stopDistance) {
                return distanceToStop < stopDistance + 30;
            }
            
            return distanceToStop < stopDistance;
        }
        
        if (this.busPriorityEnabled && car.isBus) {
            return lightColor !== 'red';
        }
        
        return false;
    }
    
    hasPassedIntersection(car) {
        switch (car.direction) {
            case 'north':
                return car.y < this.centerY - this.roadWidth / 2;
            case 'south':
                return car.y > this.centerY + this.roadWidth / 2;
            case 'east':
                return car.x > this.centerX + this.roadWidth / 2;
            case 'west':
                return car.x < this.centerX - this.roadWidth / 2;
            default:
                return false;
        }
    }
    
    spawnPedestrians(deltaTime) {
        const directions = ['ns1', 'ns2', 'ew1', 'ew2'];
        
        directions.forEach((dir) => {
            const spawnProbability = this.pedFlowRate * deltaTime;
            
            if (Math.random() < spawnProbability / 4) {
                this.spawnPedestrian(dir);
            }
        });
    }
    
    spawnPedestrian(direction) {
        const pedestrian = {
            id: this.pedIdCounter++,
            direction: direction,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            speed: 0,
            maxSpeed: 1.5,
            waitTime: 0,
            isWaiting: false,
            hasCrossed: false,
            color: '#9333ea'
        };
        
        switch (direction) {
            case 'ns1':
                pedestrian.x = this.centerX - this.roadWidth / 2 - 15;
                pedestrian.y = this.canvas.height - 50;
                pedestrian.vy = -1;
                break;
            case 'ns2':
                pedestrian.x = this.centerX + this.roadWidth / 2 + 15;
                pedestrian.y = 50;
                pedestrian.vy = 1;
                break;
            case 'ew1':
                pedestrian.x = 50;
                pedestrian.y = this.centerY - this.roadWidth / 2 - 15;
                pedestrian.vx = 1;
                break;
            case 'ew2':
                pedestrian.x = this.canvas.width - 50;
                pedestrian.y = this.centerY + this.roadWidth / 2 + 15;
                pedestrian.vx = -1;
                break;
        }
        
        this.pedestrians.push(pedestrian);
    }
    
    updatePedestrians(deltaTime) {
        const pedsToRemove = [];
        
        this.pedestrians.forEach((ped, index) => {
            const isNS = ped.direction.startsWith('ns');
            const lightColor = isNS ? this.pedLights.ns : this.pedLights.ew;
            
            const crosswalkPos = isNS ? this.centerY : this.centerX;
            const distanceToCrosswalk = isNS ? 
                Math.abs(ped.y - crosswalkPos) : Math.abs(ped.x - crosswalkPos);
            
            if (distanceToCrosswalk < 30 && lightColor === 'red') {
                ped.speed = 0;
                ped.isWaiting = true;
                ped.waitTime += deltaTime;
            } else {
                ped.speed = ped.maxSpeed;
                ped.isWaiting = false;
            }
            
            if (ped.vx !== 0) ped.x += ped.vx * ped.speed;
            if (ped.vy !== 0) ped.y += ped.vy * ped.speed;
            
            if (!ped.hasCrossed && distanceToCrosswalk < 5) {
                ped.hasCrossed = true;
                this.pedThroughput++;
            }
            
            if (ped.x < -50 || ped.x > this.canvas.width + 50 ||
                ped.y < -50 || ped.y > this.canvas.height + 50) {
                pedsToRemove.push(index);
            }
        });
        
        for (let i = pedsToRemove.length - 1; i >= 0; i--) {
            this.pedestrians.splice(pedsToRemove[i], 1);
        }
    }
    
    updateStats() {
        document.getElementById('throughput').textContent = this.totalThroughput;
        document.getElementById('congestion').textContent = this.cars.filter(c => c.isWaiting).length;
        
        document.getElementById('totalCars').textContent = this.totalThroughput;
        const avgWait = this.carsProcessed > 0 ? (this.totalWaitTime / this.carsProcessed).toFixed(1) : 0;
        document.getElementById('avgWaitTime').textContent = avgWait + 's';
        document.getElementById('maxQueue').textContent = this.maxQueueLength;
        document.getElementById('currentCongestion').textContent = this.cars.filter(c => c.isWaiting).length;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrass();
        this.drawCrosswalks();
        this.drawRoads();
        this.drawIntersection();
        this.drawLaneMarkings();
        this.drawTrafficLights();
        if (this.pedestrianEnabled) {
            this.drawPedestrianLights();
        }
        this.drawCars();
        if (this.pedestrianEnabled) {
            this.drawPedestrians();
        }
    }
    
    drawGrass() {
        this.ctx.fillStyle = '#2d5a27';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawCrosswalks() {
        this.ctx.fillStyle = '#ffffff';
        const stripeWidth = 8;
        const stripeSpacing = 15;
        const crosswalkWidth = 60;
        
        for (let i = 0; i < crosswalkWidth; i += stripeSpacing) {
            this.ctx.fillRect(
                this.centerX - this.roadWidth / 2 - 30 + i,
                this.centerY + this.roadWidth / 2 + 5,
                stripeWidth,
                25
            );
            this.ctx.fillRect(
                this.centerX - this.roadWidth / 2 - 30 + i,
                this.centerY - this.roadWidth / 2 - 30,
                stripeWidth,
                25
            );
        }
        
        for (let i = 0; i < crosswalkWidth; i += stripeSpacing) {
            this.ctx.fillRect(
                this.centerX + this.roadWidth / 2 + 5,
                this.centerY - this.roadWidth / 2 - 30 + i,
                25,
                stripeWidth
            );
            this.ctx.fillRect(
                this.centerX - this.roadWidth / 2 - 30,
                this.centerY - this.roadWidth / 2 - 30 + i,
                25,
                stripeWidth
            );
        }
    }
    
    drawRoads() {
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(0, this.centerY - this.roadWidth / 2, this.canvas.width, this.roadWidth);
        this.ctx.fillRect(this.centerX - this.roadWidth / 2, 0, this.roadWidth, this.canvas.height);
    }
    
    drawIntersection() {
        this.ctx.fillStyle = '#3a3a3a';
        this.ctx.fillRect(
            this.centerX - this.roadWidth / 2,
            this.centerY - this.roadWidth / 2,
            this.roadWidth,
            this.roadWidth
        );
    }
    
    drawLaneMarkings() {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([20, 15]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY);
        this.ctx.lineTo(this.centerX - this.roadWidth / 2, this.centerY);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX + this.roadWidth / 2, this.centerY);
        this.ctx.lineTo(this.canvas.width, this.centerY);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 0);
        this.ctx.lineTo(this.centerX, this.centerY - this.roadWidth / 2);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY + this.roadWidth / 2);
        this.ctx.lineTo(this.centerX, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    drawTrafficLights() {
        const lightPositions = [
            { x: this.centerX - this.roadWidth / 2 - 20, y: this.centerY - this.roadWidth / 2 - 40, dir: 'north' },
            { x: this.centerX + this.roadWidth / 2 + 20, y: this.centerY + this.roadWidth / 2 + 40, dir: 'south' },
            { x: this.centerX - this.roadWidth / 2 - 40, y: this.centerY + this.roadWidth / 2 + 20, dir: 'east' },
            { x: this.centerX + this.roadWidth / 2 + 40, y: this.centerY - this.roadWidth / 2 - 20, dir: 'west' }
        ];
        
        lightPositions.forEach(pos => {
            this.drawSingleLight(pos.x, pos.y, this.trafficLights[pos.dir]);
        });
    }
    
    drawSingleLight(x, y, color) {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(x - 15, y - 30, 30, 60);
        
        this.ctx.beginPath();
        this.ctx.arc(x, y - 15, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = color === 'red' ? '#ff0000' : '#330000';
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = color === 'yellow' ? '#ffff00' : '#333300';
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x, y + 15, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = color === 'green' ? '#00ff00' : '#003300';
        this.ctx.fill();
    }
    
    drawPedestrianLights() {
        const positions = [
            { x: this.centerX - this.roadWidth / 2 - 35, y: this.centerY + this.roadWidth / 2 + 50, dir: 'ns' },
            { x: this.centerX + this.roadWidth / 2 + 35, y: this.centerY - this.roadWidth / 2 - 50, dir: 'ns' },
            { x: this.centerX - this.roadWidth / 2 - 50, y: this.centerY - this.roadWidth / 2 - 35, dir: 'ew' },
            { x: this.centerX + this.roadWidth / 2 + 50, y: this.centerY + this.roadWidth / 2 + 35, dir: 'ew' }
        ];
        
        positions.forEach(pos => {
            this.drawSinglePedLight(pos.x, pos.y, this.pedLights[pos.dir]);
        });
    }
    
    drawSinglePedLight(x, y, color) {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(x - 12, y - 12, 24, 24);
        
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        if (color === 'green') {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText('🚶', x, y);
        } else if (color === 'flashing') {
            this.ctx.fillStyle = Math.floor(Date.now() / 500) % 2 ? '#ffff00' : '#333300';
            this.ctx.fillText('🚶', x, y);
        } else {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillText('✋', x, y);
        }
    }
    
    drawCars() {
        this.cars.forEach(car => {
            this.ctx.save();
            this.ctx.translate(car.x + car.width / 2, car.y + car.height / 2);
            
            let angle = 0;
            if (car.direction === 'north') angle = -Math.PI / 2;
            if (car.direction === 'south') angle = Math.PI / 2;
            if (car.direction === 'west') angle = Math.PI;
            
            this.ctx.rotate(angle);
            
            this.ctx.fillStyle = car.color;
            this.ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
            
            this.ctx.fillStyle = '#60a5fa';
            this.ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 3, car.width - 15, car.height - 6);
            
            if (car.isBus) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('BUS', 0, 3);
            }
            
            if (car.isWaiting) {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(car.width / 2 - 3, -car.height / 4, 3, 0, Math.PI * 2);
                this.ctx.arc(car.width / 2 - 3, car.height / 4, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    drawPedestrians() {
        this.pedestrians.forEach(ped => {
            this.ctx.save();
            this.ctx.translate(ped.x, ped.y);
            
            this.ctx.fillStyle = ped.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            if (ped.isWaiting) {
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('⏳', 0, -12);
            }
            
            this.ctx.restore();
        });
    }
    
    saveScheme() {
        const score = this.calculateScore();
        const scheme = {
            id: Date.now(),
            name: `方案 ${this.schemes.length + 1}`,
            mode: this.signalMode,
            cycleLength: this.cycleLength,
            nsGreenRatio: this.nsGreenRatio,
            ewGreenRatio: this.ewGreenRatio,
            nsFlowRate: this.nsFlowRate,
            ewFlowRate: this.ewFlowRate,
            busRatio: this.busRatio,
            busPriority: this.busPriorityEnabled,
            pedestrianEnabled: this.pedestrianEnabled,
            minGreenTime: this.minGreenTime,
            detectionDistance: this.detectionDistance,
            waveSpeed: this.waveSpeed,
            bandwidth: this.bandwidth,
            pedFlowRate: this.pedFlowRate,
            pedCrossTime: this.pedCrossTime,
            score: score,
            throughput: this.totalThroughput,
            busThroughput: this.busThroughput,
            pedThroughput: this.pedThroughput,
            avgWaitTime: this.carsProcessed > 0 ? (this.totalWaitTime / this.carsProcessed).toFixed(1) : 0,
            timestamp: new Date().toLocaleString()
        };
        
        this.schemes.push(scheme);
        this.schemes.sort((a, b) => b.score - a.score);
        localStorage.setItem('trafficSchemes', JSON.stringify(this.schemes));
        this.updateSchemeList();
        alert('方案保存成功！');
    }
    
    calculateScore() {
        if (this.totalThroughput === 0) return 0;
        const throughputScore = this.totalThroughput * 10;
        const busBonus = this.busThroughput * 5;
        const pedBonus = this.pedThroughput * 2;
        const waitPenalty = this.carsProcessed > 0 ? (this.totalWaitTime / this.carsProcessed) * 5 : 0;
        const congestionPenalty = this.maxQueueLength * 2;
        return Math.max(0, throughputScore + busBonus + pedBonus - waitPenalty - congestionPenalty);
    }
    
    loadBestScheme() {
        if (this.schemes.length === 0) {
            alert('暂无保存的方案');
            return;
        }
        
        this.loadScheme(this.schemes[0]);
    }
    
    loadScheme(scheme) {
        this.signalMode = scheme.mode || 'fixed';
        this.cycleLength = scheme.cycleLength;
        this.nsGreenRatio = scheme.nsGreenRatio;
        this.ewGreenRatio = scheme.ewGreenRatio;
        this.nsFlowRate = scheme.nsFlowRate;
        this.ewFlowRate = scheme.ewFlowRate;
        this.busRatio = scheme.busRatio || 0.1;
        this.busPriorityEnabled = scheme.busPriority || false;
        this.pedestrianEnabled = scheme.pedestrianEnabled || false;
        this.minGreenTime = scheme.minGreenTime || 10;
        this.detectionDistance = scheme.detectionDistance || 100;
        this.waveSpeed = scheme.waveSpeed || 40;
        this.bandwidth = scheme.bandwidth || 0.3;
        this.pedFlowRate = scheme.pedFlowRate || 3;
        this.pedCrossTime = scheme.pedCrossTime || 15;
        
        document.querySelectorAll('input[name="signalMode"]').forEach(radio => {
            radio.checked = radio.value === this.signalMode;
        });
        this.updateModeOptions();
        
        document.getElementById('busPriority').checked = this.busPriorityEnabled;
        document.getElementById('pedestrianEnabled').checked = this.pedestrianEnabled;
        document.getElementById('pedestrianSection').classList.toggle('hidden', !this.pedestrianEnabled);
        
        document.getElementById('cycleSlider').value = this.cycleLength;
        document.getElementById('cycleValue').textContent = this.cycleLength;
        document.getElementById('cycleDisplay').textContent = this.cycleLength + 's';
        
        document.getElementById('nsGreenSlider').value = this.nsGreenRatio * 100;
        document.getElementById('nsGreenValue').textContent = Math.round(this.nsGreenRatio * 100);
        
        document.getElementById('ewGreenSlider').value = this.ewGreenRatio * 100;
        document.getElementById('ewGreenValue').textContent = Math.round(this.ewGreenRatio * 100);
        
        document.getElementById('nsFlowSlider').value = this.nsFlowRate;
        document.getElementById('nsFlowValue').textContent = this.nsFlowRate;
        
        document.getElementById('ewFlowSlider').value = this.ewFlowRate;
        document.getElementById('ewFlowValue').textContent = this.ewFlowRate;
        
        document.getElementById('busRatioSlider').value = this.busRatio * 100;
        document.getElementById('busRatioValue').textContent = Math.round(this.busRatio * 100);
        
        document.getElementById('minGreenSlider').value = this.minGreenTime;
        document.getElementById('minGreenValue').textContent = this.minGreenTime;
        
        document.getElementById('detectionSlider').value = this.detectionDistance;
        document.getElementById('detectionValue').textContent = this.detectionDistance;
        
        document.getElementById('waveSpeedSlider').value = this.waveSpeed;
        document.getElementById('waveSpeedValue').textContent = this.waveSpeed;
        
        document.getElementById('bandwidthSlider').value = this.bandwidth * 100;
        document.getElementById('bandwidthValue').textContent = Math.round(this.bandwidth * 100);
        
        document.getElementById('pedFlowSlider').value = this.pedFlowRate;
        document.getElementById('pedFlowValue').textContent = this.pedFlowRate;
        
        document.getElementById('pedCrossTimeSlider').value = this.pedCrossTime;
        document.getElementById('pedCrossTimeValue').textContent = this.pedCrossTime;
        
        alert('已加载配时方案！');
    }
    
    updateSchemeList() {
        const listEl = document.getElementById('schemeList');
        listEl.innerHTML = '';
        
        this.schemes.slice(0, 5).forEach(scheme => {
            const item = document.createElement('div');
            item.className = 'scheme-item';
            item.innerHTML = `
                <div class="scheme-title">${scheme.name} (${scheme.mode === 'fixed' ? '固定' : scheme.mode === 'actuated' ? '感应' : '绿波'})</div>
                <div class="scheme-meta">
                    周期: ${scheme.cycleLength}s | 通行: ${scheme.throughput}辆 | 得分: ${Math.round(scheme.score)}
                    <br>${scheme.timestamp}
                </div>
                <div class="scheme-actions">
                    <button class="load-btn" data-id="${scheme.id}">加载</button>
                    <button class="delete-btn" data-id="${scheme.id}">删除</button>
                </div>
            `;
            listEl.appendChild(item);
        });
        
        listEl.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const scheme = this.schemes.find(s => s.id === id);
                if (scheme) this.loadScheme(scheme);
            });
        });
        
        listEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.schemes = this.schemes.filter(s => s.id !== id);
                localStorage.setItem('trafficSchemes', JSON.stringify(this.schemes));
                this.updateSchemeList();
            });
        });
    }
    
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (typeof data !== 'object' || data === null) {
                    throw new Error('无效的数据格式');
                }
                
                this.importedData = data;
                
                if (data.cycleLength !== undefined && data.cycleLength !== null) {
                    const cycleValue = parseFloat(data.cycleLength);
                    if (!isNaN(cycleValue) && cycleValue >= 30 && cycleValue <= 200) {
                        this.cycleLength = cycleValue;
                    }
                }
                
                if (data.nsGreenRatio !== undefined && data.nsGreenRatio !== null) {
                    const ratioValue = parseFloat(data.nsGreenRatio);
                    if (!isNaN(ratioValue) && ratioValue >= 0.1 && ratioValue <= 0.9) {
                        this.nsGreenRatio = ratioValue;
                    }
                }
                
                if (data.ewGreenRatio !== undefined && data.ewGreenRatio !== null) {
                    const ratioValue = parseFloat(data.ewGreenRatio);
                    if (!isNaN(ratioValue) && ratioValue >= 0.1 && ratioValue <= 0.9) {
                        this.ewGreenRatio = ratioValue;
                    }
                }
                
                if (data.nsFlowRate !== undefined && data.nsFlowRate !== null) {
                    const flowValue = parseFloat(data.nsFlowRate);
                    if (!isNaN(flowValue) && flowValue >= 1 && flowValue <= 30) {
                        this.nsFlowRate = flowValue;
                    }
                }
                
                if (data.ewFlowRate !== undefined && data.ewFlowRate !== null) {
                    const flowValue = parseFloat(data.ewFlowRate);
                    if (!isNaN(flowValue) && flowValue >= 1 && flowValue <= 30) {
                        this.ewFlowRate = flowValue;
                    }
                }
                
                this.updateUIFromData();
                
                const intersectionName = (data.intersectionName && typeof data.intersectionName === 'string') 
                    ? data.intersectionName : '未知路口';
                const cycleDisplay = data.cycleLength ? `${data.cycleLength}s` : '-';
                const sourceDisplay = (data.source && typeof data.source === 'string') 
                    ? data.source : '未知来源';
                
                const dataInfoEl = document.getElementById('dataInfo');
                if (dataInfoEl) {
                    dataInfoEl.innerHTML = `
                        <strong>✓ 数据导入成功</strong><br>
                        路口: ${this.escapeHtml(intersectionName)}<br>
                        周期: ${cycleDisplay}<br>
                        数据来源: ${this.escapeHtml(sourceDisplay)}
                    `;
                }
                
                alert('真实路口数据导入成功！');
            } catch (err) {
                console.error('数据导入错误:', err);
                alert(`数据导入失败: ${err.message || '数据格式错误，请导入有效的JSON文件'}`);
            }
        };
        
        reader.onerror = () => {
            alert('文件读取失败，请重试');
        };
        
        reader.readAsText(file);
    }
    
    updateUIFromData() {
        const cycleSlider = document.getElementById('cycleSlider');
        const cycleValue = document.getElementById('cycleValue');
        const cycleDisplay = document.getElementById('cycleDisplay');
        if (cycleSlider && cycleValue && cycleDisplay) {
            cycleSlider.value = Math.round(this.cycleLength);
            cycleValue.textContent = Math.round(this.cycleLength);
            cycleDisplay.textContent = Math.round(this.cycleLength) + 's';
        }
        
        const nsGreenSlider = document.getElementById('nsGreenSlider');
        const nsGreenValue = document.getElementById('nsGreenValue');
        if (nsGreenSlider && nsGreenValue) {
            nsGreenSlider.value = Math.round(this.nsGreenRatio * 100);
            nsGreenValue.textContent = Math.round(this.nsGreenRatio * 100);
        }
        
        const ewGreenSlider = document.getElementById('ewGreenSlider');
        const ewGreenValue = document.getElementById('ewGreenValue');
        if (ewGreenSlider && ewGreenValue) {
            ewGreenSlider.value = Math.round(this.ewGreenRatio * 100);
            ewGreenValue.textContent = Math.round(this.ewGreenRatio * 100);
        }
        
        const nsFlowSlider = document.getElementById('nsFlowSlider');
        const nsFlowValue = document.getElementById('nsFlowValue');
        if (nsFlowSlider && nsFlowValue) {
            nsFlowSlider.value = Math.round(this.nsFlowRate);
            nsFlowValue.textContent = Math.round(this.nsFlowRate);
        }
        
        const ewFlowSlider = document.getElementById('ewFlowSlider');
        const ewFlowValue = document.getElementById('ewFlowValue');
        if (ewFlowSlider && ewFlowValue) {
            ewFlowSlider.value = Math.round(this.ewFlowRate);
            ewFlowValue.textContent = Math.round(this.ewFlowRate);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showComparison() {
        if (this.schemes.length === 0) {
            alert('暂无保存的方案可对比');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="comparison-content">
                <h2>📊 配时方案对比</h2>
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>方案名称</th>
                            <th>模式</th>
                            <th>周期(s)</th>
                            <th>通行量</th>
                            <th>公交通行</th>
                            <th>平均等待(s)</th>
                            <th>得分</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.schemes.slice(0, 5).map(s => `
                            <tr>
                                <td>${s.name}</td>
                                <td>${s.mode === 'fixed' ? '固定' : s.mode === 'actuated' ? '感应' : '绿波'}</td>
                                <td>${s.cycleLength}</td>
                                <td>${s.throughput}</td>
                                <td>${s.busThroughput || 0}</td>
                                <td>${s.avgWaitTime}</td>
                                <td><strong>${Math.round(s.score)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <button class="close-modal">关闭</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TrafficSimulation();
});
