# 🧪 交通流模型测试系统

一个全面的交通流模型与信号控制算法测试套件，涵盖跟驰模型、换道模型、Webster配时公式、延误计算等核心功能。

## 📁 文件结构

```
├── test.html              # 测试页面入口
├── test.css               # 测试页面样式
├── traffic-models.js      # 交通流模型实现
├── test-runner.js         # 测试运行器框架
├── tests.js               # 测试用例集合
└── TEST-README.md         # 本说明文件
```

## 🚀 快速开始

1. **打开测试页面**
   - 在浏览器中打开 `test.html`
   - 你将看到5个测试分类卡片和测试控制台

2. **运行测试**
   - 点击 "运行所有测试" 按钮执行全部测试
   - 测试将依次执行，并在页面上实时显示结果

3. **查看结果**
   - 顶部汇总面板显示：总测试数、通过数、失败数、耗时
   - 每个测试卡片显示对应分类的测试项和状态
   - 底部控制台显示详细的测试执行日志

## 🧪 测试分类详解

### 1. 🚗 跟驰模型测试 (Car-Following)
验证车辆跟驰行为模型的正确性

| 测试ID | 测试名称 | 验证内容 |
|--------|---------|---------|
| cf1 | IDM模型自由流状态 | 无前车时加速度趋近于0 |
| cf2 | IDM模型跟驰状态 | 正常跟驰时车距和加速度计算 |
| cf3 | IDM模型紧急制动 | 近距前车时减速行为正确性 |
| cf4 | Gipps模型期望速度 | 期望速度计算和安全车距验证 |
| cf5 | OptimalVelocity模型 | 最优速度函数计算验证 |
| cf6 | 三种模型一致性 | 三种跟驰模型输出对比检验 |

**涉及模型：**
- **IDM (Intelligent Driver Model)** - 智能驾驶员模型
- **Gipps Model** - 基于安全间距的跟驰模型
- **Optimal Velocity Model** - 最优速度模型

### 2. ⏱️ Webster配时公式验证
验证信号配时计算的正确性

| 测试ID | 测试名称 | 验证内容 |
|--------|---------|---------|
| ws1 | 最佳周期计算 | Webster公式Co计算正确性 |
| ws2 | 绿灯时间分配 | 等流量时绿灯时间均等性 |
| ws3 | 饱和度验证 | V/C比在合理范围内 |
| ws4 | 周期边界检查 | 最小/最大周期限制生效 |
| ws5 | 延误计算验证 | Webster延误公式正确性 |
| ws6 | 三种方法对比 | Webster/ARRB/HCM2010对比 |

**Webster公式：**
```
最佳周期 Co = (1.5L + 5) / (1 - Y)
其中：L = 总损失时间，Y = 流量比之和
```

### 3. 📊 平均延误计算测试
验证交叉口延误计算模型

| 测试ID | 测试名称 | 验证内容 |
|--------|---------|---------|
| dl1 | Webster延误公式 | 基准延误值范围验证 |
| dl2 | 延误随流量变化 | 流量增加延误单调递增 |
| dl3 | HCM2010延误分解 | 均匀延误+增量延误总和 |
| dl4 | V/C比对延误影响 | 饱和度增加延误增长 |
| dl5 | Akcelik延误公式 | 过饱和延误计算验证 |
| dl6 | 三公式一致性 | 三种公式结果合理范围 |

**延误公式对比：**
- **Webster**：适用于V/C < 0.9
- **HCM2010**：含过饱和修正，最全面
- **Akcelik**：简单过饱和近似

### 4. 🚦 信号灯控制逻辑测试
验证信号控制的约束条件

| 测试ID | 测试名称 | 验证内容 |
|--------|---------|---------|
| sg1 | 相位时长总和 | 绿+黄+全红=周期长度 |
| sg2 | 最小绿灯时间 | 各相位绿灯≥5秒 |
| sg3 | 绿信比总和 | 有效绿信比范围(0.7,1) |
| sg4 | 流量守恒 | 流入=流出+排队变化 |
| sg5 | 饱和流率约束 | 流出≤饱和流率×绿信比 |
| sg6 | 周期一致性 | 计算值与理论值一致 |

### 5. 🔀 换道模型测试 (Lane-Changing)
验证MOBIL换道决策模型

| 测试ID | 测试名称 | 验证内容 |
|--------|---------|---------|
| lc1 | 换道动机验证 | 收益为正时触发换道 |
| lc2 | 安全约束验证 | 后车加速度在安全范围 |
| lc3 | 礼貌因子影响 | 礼貌因子↑换道动机↓ |
| lc4 | 阈值敏感性 | 阈值↑换道概率↓ |

**MOBIL模型核心：**
```
激励 = 本车收益 - 礼貌因子 × 其他车辆总损失
```

## 📈 模型实现说明

### 🚗 跟驰模型
```javascript
// IDM模型
TrafficModels.CarFollowing.IDM(leader, follower, params)

// Gipps模型
TrafficModels.CarFollowing.Gipps(leader, follower, params)

// 最优速度模型
TrafficModels.CarFollowing.OptimalVelocity(leader, follower, params)
```

### ⏱️ 信号配时
```javascript
// Webster方法
TrafficModels.SignalTiming.Webster(flows, saturationFlows, lostTime)

// ARRB方法
TrafficModels.SignalTiming.ARRB(flows, saturationFlows, lostTime)

// HCM2010方法
TrafficModels.SignalTiming.HCM2010(flows, saturationFlows, lostTime)
```

### 📊 延误计算
```javascript
// Webster延误
TrafficModels.Delay.Webster(cycle, greenTime, flow, satFlow)

// HCM2010延误
TrafficModels.Delay.HCM2010(cycle, greenTime, flow, satFlow)

// Akcelik延误
TrafficModels.Delay.AKCELIK(cycle, greenTime, flow, satFlow)
```

### 🔀 换道模型
```javascript
// MOBIL换道决策
TrafficModels.LaneChanging.MOBIL(follower, newFollower, newLeader, params)
```

## 🎯 关键参数参考

| 参数 | 典型值 | 说明 |
|------|--------|------|
| 饱和流率 | 1800 pcu/h/车道 | 标准值 |
| 启动损失时间 | 2-4 s/相位 | 每相位黄灯+全红 |
| 最小绿灯时间 | 5-7 s | 行人过街需求 |
| 最佳周期范围 | 40-120 s |  Webster推荐 |
| V/C比设计值 | 0.8-0.9 | 避免过饱和 |

## 📋 测试报告导出

测试完成后，点击"导出报告"按钮，系统会生成JSON格式的测试报告：

```json
{
  "generatedAt": "2024-...",
  "summary": {
    "totalTests": 28,
    "passed": 28,
    "failed": 0,
    "passRate": "100%",
    "totalDuration": "45.23ms"
  },
  "results": [...]
}
```

## 🔧 扩展测试用例

在 `tests.js` 中添加新测试：

```javascript
testRunner.describe('新测试分类', [
    {
        id: 'test1',
        name: '测试名称',
        category: '对应容器id',
        fn: () => {
            const result = yourFunction();
            expect(result).toBe(expectedValue);
        }
    }
]);
```

## ✅ 断言类型

测试运行器支持以下断言：

| 断言方法 | 说明 |
|---------|------|
| `toBe(expected)` | 严格相等 |
| `toEqual(expected)` | 深度相等 |
| `toBeGreaterThan(expected)` | 大于 |
| `toBeLessThan(expected)` | 小于 |
| `toBeCloseTo(expected, precision)` | 近似相等 |
| `toBeGreaterThanOrEqual(expected)` | 大于等于 |
| `toBeLessThanOrEqual(expected)` | 小于等于 |
| `toBeTruthy()` | 真值判断 |
| `toBeFalsy()` | 假值判断 |
| `toHaveLength(expected)` | 数组/字符串长度 |

## 📊 理论基础参考

### Webster配时理论
1. **流量比 Y = q/s** - 实际流量与饱和流率之比
2. **临界流量比 Yc = max(Y_i)** - 关键相位流量比
3. **最佳周期 Co = (1.5L + 5)/(1-Y)**
4. **绿灯时间 g_i = Co × Y_i/Y**

### 延误计算
- **均匀延误 d1**: 周期到达产生的延误
- **增量延误 d2**: 随机到达和过饱和产生的额外延误
- **初始排队延误 d3**: 上一周期剩余排队延误

**总延误 d = d1 + d2 + d3**

---

🎯 **提示：** 所有测试通过表明模型实现正确，可放心用于交通模拟和信号配时设计！
