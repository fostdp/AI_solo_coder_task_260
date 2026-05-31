class TestRunner {
    constructor() {
        this.testSuites = [];
        this.results = [];
        this.passedCount = 0;
        this.failedCount = 0;
        this.startTime = 0;
        this.totalDuration = 0;
        this.output = [];
    }
    
    describe(suiteName, tests) {
        this.testSuites.push({
            name: suiteName,
            tests: tests
        });
    }
    
    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected} but got ${actual}`);
                }
                return true;
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
                }
                return true;
            },
            toBeGreaterThan: (expected) => {
                if (actual <= expected) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
                return true;
            },
            toBeLessThan: (expected) => {
                if (actual >= expected) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
                return true;
            },
            toBeCloseTo: (expected, precision = 2) => {
                const multiplier = Math.pow(10, precision);
                const actualRounded = Math.round(actual * multiplier) / multiplier;
                const expectedRounded = Math.round(expected * multiplier) / multiplier;
                if (actualRounded !== expectedRounded) {
                    throw new Error(`Expected ${actual} to be close to ${expected} (within ${precision} decimals)`);
                }
                return true;
            },
            toBeGreaterThanOrEqual: (expected) => {
                if (actual < expected) {
                    throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
                }
                return true;
            },
            toBeLessThanOrEqual: (expected) => {
                if (actual > expected) {
                    throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
                }
                return true;
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value but got ${actual}`);
                }
                return true;
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value but got ${actual}`);
                }
                return true;
            },
            toBeInstanceOf: (expected) => {
                if (!(actual instanceof expected)) {
                    throw new Error(`Expected instance of ${expected.name}`);
                }
                return true;
            },
            toHaveLength: (expected) => {
                if (actual.length !== expected) {
                    throw new Error(`Expected length ${expected} but got ${actual.length}`);
                }
                return true;
            }
        };
    }
    
    async runAll() {
        this.results = [];
        this.passedCount = 0;
        this.failedCount = 0;
        this.output = [];
        this.startTime = performance.now();
        
        this.log('🧪 Starting test suite execution...\n', 'info');
        
        for (const suite of this.testSuites) {
            await this.runSuite(suite);
        }
        
        this.totalDuration = performance.now() - this.startTime;
        
        this.log('\n' + '═'.repeat(60), 'info');
        this.log(`📊 Test Results: ${this.passedCount}/${this.passedCount + this.failedCount} passed`, 
            this.failedCount === 0 ? 'pass' : 'fail');
        this.log(`⏱️  Total duration: ${this.totalDuration.toFixed(2)}ms`, 'info');
        
        this.updateSummaryUI();
        return this.results;
    }
    
    async runSuite(suite) {
        this.log(`\n${'━'.repeat(50)}`, 'section');
        this.log(`📁 ${suite.name}`, 'section');
        this.log(`${'━'.repeat(50)}\n`, 'section');
        
        for (const test of suite.tests) {
            await this.runTest(test);
        }
    }
    
    async runTest(test) {
        const testStartTime = performance.now();
        let passed = false;
        let error = null;
        
        this.updateTestItemUI(test.id, 'running');
        
        try {
            await test.fn();
            passed = true;
            this.passedCount++;
            this.log(`  ✅ ${test.name}`, 'pass');
        } catch (e) {
            passed = false;
            error = e.message;
            this.failedCount++;
            this.log(`  ❌ ${test.name}`, 'fail');
            this.log(`     ${error}`, 'fail');
        }
        
        const duration = performance.now() - testStartTime;
        
        this.results.push({
            id: test.id,
            name: test.name,
            category: test.category,
            passed: passed,
            duration: duration,
            error: error
        });
        
        this.updateTestItemUI(test.id, passed ? 'passed' : 'failed', duration);
        this.updateSummaryUI();
        
        return { passed, duration, error };
    }
    
    log(message, type = 'info') {
        this.output.push({ message, type, timestamp: new Date() });
        this.updateOutputUI();
    }
    
    updateOutputUI() {
        const outputEl = document.getElementById('testOutput');
        if (!outputEl) return;
        
        outputEl.innerHTML = this.output.map(item => {
            const className = item.type;
            return `<span class="${className}">${this.escapeHtml(item.message)}</span>`;
        }).join('\n');
        
        outputEl.scrollTop = outputEl.scrollHeight;
    }
    
    updateSummaryUI() {
        const totalEl = document.getElementById('totalTests');
        const passedEl = document.getElementById('passedTests');
        const failedEl = document.getElementById('failedTests');
        const durationEl = document.getElementById('testDuration');
        
        if (totalEl) totalEl.textContent = this.passedCount + this.failedCount;
        if (passedEl) passedEl.textContent = this.passedCount;
        if (failedEl) failedEl.textContent = this.failedCount;
        if (durationEl) durationEl.textContent = this.totalDuration.toFixed(1) + 'ms';
    }
    
    updateTestItemUI(testId, status, duration = null) {
        const testItem = document.querySelector(`[data-test-id="${testId}"]`);
        if (!testItem) return;
        
        testItem.classList.remove('passed', 'failed', 'running');
        testItem.classList.add(status);
        
        const statusEl = testItem.querySelector('.test-status');
        if (statusEl) {
            if (status === 'passed') statusEl.textContent = '✅';
            else if (status === 'failed') statusEl.textContent = '❌';
            else if (status === 'running') statusEl.textContent = '⏳';
        }
        
        if (duration !== null) {
            const durationEl = testItem.querySelector('.test-duration');
            if (durationEl) {
                durationEl.textContent = duration.toFixed(1) + 'ms';
            }
        }
    }
    
    createTestItemsUI() {
        const categories = {
            carFollowing: document.getElementById('carFollowingTests'),
            webster: document.getElementById('websterTests'),
            delay: document.getElementById('delayTests'),
            signal: document.getElementById('signalTests'),
            laneChange: document.getElementById('laneChangeTests')
        };
        
        for (const suite of this.testSuites) {
            for (const test of suite.tests) {
                const container = categories[test.category];
                if (!container) continue;
                
                const testItem = document.createElement('div');
                testItem.className = 'test-item';
                testItem.setAttribute('data-test-id', test.id);
                testItem.innerHTML = `
                    <span class="test-status">○</span>
                    <span class="test-name">${test.name}</span>
                    <span class="test-duration"></span>
                `;
                container.appendChild(testItem);
            }
        }
    }
    
    exportResults() {
        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalTests: this.passedCount + this.failedCount,
                passed: this.passedCount,
                failed: this.failedCount,
                passRate: ((this.passedCount / (this.passedCount + this.failedCount)) * 100).toFixed(1) + '%',
                totalDuration: this.totalDuration.toFixed(2) + 'ms'
            },
            results: this.results.map(r => ({
                test: r.name,
                category: r.category,
                passed: r.passed,
                duration: r.duration.toFixed(2) + 'ms',
                error: r.error
            }))
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `traffic-model-test-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const testRunner = new TestRunner();
