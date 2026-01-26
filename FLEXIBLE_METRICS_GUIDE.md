# 灵活指标系统使用指南

## 概述

灵活指标系统允许每个用户自定义自己需要记录的健康指标，而不再局限于固定的4个指标。

## 功能特性

### 1. 预设指标库

系统内置15个常用健康指标：

**数值类型**：
- 🌡️ 体温 (temperature) - 单位: ℃
- ❤️ 心率 (heart_rate) - 单位: 次/分
- 🫁 血氧 (oxygen) - 单位: %
- ⚖️ 体重 (weight) - 单位: kg
- 📏 腰围 (waist) - 单位: cm
- 💧 饮水量 (water_intake) - 单位: ml
- 🚽 排尿量 (urine_output) - 单位: ml
- 💉 收缩压 (blood_pressure_high) - 单位: mmHg
- 💉 舒张压 (blood_pressure_low) - 单位: mmHg
- 🩸 血糖 (blood_sugar) - 单位: mmol/L
- 😴 睡眠时长 (sleep_hours) - 单位: 小时
- 👟 步数 (steps) - 单位: 步

**选择类型**：
- 😊 心情 (mood) - 选项: 很好/良好/一般/较差/很差
- 🍽️ 饮食 (diet) - 选项: 清淡/正常/油腻/高热量/未进食
- 🏃 运动 (exercise) - 选项: 剧烈/中等/轻度/无运动

### 2. 自定义指标

用户可以创建自己的指标，支持三种数据类型：

- **数值 (number)**：可设置单位、最小值、最大值、小数位数
- **文本 (text)**：自由输入文本内容
- **选择 (select)**：从预设选项中选择

### 3. 灵活配置

- 从预设库中选择需要的指标
- 拖拽调整指标显示顺序
- 随时添加或移除指标
- 每个用户独立配置，互不影响

## 迁移指南

### 从固定4指标版本升级

如果您正在使用旧版本（固定体温、心率、血氧、体重4个指标），需要执行迁移：

```bash
npm run migrate:flexible
```

### 迁移说明

迁移脚本会自动：

1. **创建新表**：
   - `metric_templates` - 存储指标模板
   - `user_metrics_config` - 存储用户配置

2. **数据迁移**：
   - 将现有记录的固定字段数据转换为 JSONB 格式
   - 备份原数据到 `health_records_backup` 表
   - 保留旧列以便回滚

3. **初始化配置**：
   - 插入15个系统预设指标
   - 为所有现有用户配置默认4个指标（体温、心率、血氧、体重）

4. **验证数据**：
   - 检查迁移前后记录数是否一致
   - 输出详细的迁移统计信息

### 迁移后检查

迁移完成后，建议：

1. 登录系统，检查主页面是否正常显示
2. 检查历史记录是否完整显示
3. 尝试添加新记录
4. 进入指标配置页面，验证配置功能

### 回滚方案

如果迁移后出现问题，可以：

1. 查看备份表：`SELECT * FROM health_records_backup`
2. 旧列仍然保留，可以临时回退到旧版本代码
3. 联系技术支持进行数据恢复

## 使用指南

### 1. 配置指标

1. 登录后，点击右上角 ⚙️ 按钮
2. 进入"指标配置"页面
3. 查看"添加指标"区域的所有可用指标
4. 点击需要的指标卡片，即可添加到"我的指标"列表
5. 在"我的指标"列表中：
   - 拖拽 ☰ 图标可调整顺序
   - 点击"删除"按钮可移除指标
6. 点击"保存配置"完成

### 2. 自定义指标

如果预设列表中没有您需要的指标：

1. 在指标配置页面点击"+ 自定义指标"
2. 填写指标信息：
   - **标识符**：英文字母+数字+下划线，如 `my_metric`
   - **显示名称**：中文名称，如 "我的指标"
   - **数据类型**：选择数值/文本/选择项
   - **单位**（数值类型）：如 kg, ml, 次
   - **最小值/最大值**（数值类型）：用于验证输入
   - **小数位数**（数值类型）：0-4位
   - **选择项**（选择类型）：每行一个选项
   - **图标**：可选，输入 emoji
   - **描述**：可选，简短说明
3. 点击"创建"
4. 新指标会自动添加到"我的指标"列表

### 3. 记录数据

配置完成后：

1. 返回主页面
2. 根据您配置的指标填写数据
3. 点击"保存记录"
4. 在历史记录区域查看所有记录

### 4. 查看历史

- 历史记录会根据您当前配置的指标动态显示
- 如果某条记录缺少某个指标，会显示 "--"
- 数值会根据配置的小数位数格式化显示

## 数据结构

### metric_templates 表

存储所有可用的指标模板：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| metric_key | VARCHAR(50) | 唯一标识 |
| metric_name | VARCHAR(50) | 显示名称 |
| data_type | VARCHAR(20) | 数据类型 |
| unit | VARCHAR(20) | 单位 |
| min_value | DECIMAL | 最小值 |
| max_value | DECIMAL | 最大值 |
| decimal_places | INTEGER | 小数位数 |
| select_options | JSONB | 选择项 |
| icon | VARCHAR(20) | 图标 |
| description | TEXT | 描述 |
| created_by | BIGINT | 创建者 |
| is_system | BOOLEAN | 是否系统预设 |

### user_metrics_config 表

存储用户的指标配置：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| user_id | BIGINT | 用户ID |
| metric_key | VARCHAR(50) | 指标标识 |
| display_order | INTEGER | 显示顺序 |
| is_active | BOOLEAN | 是否启用 |

### health_records 表

健康记录表（新增字段）：

| 字段 | 类型 | 说明 |
|------|------|------|
| metrics | JSONB | 指标数据 |

**metrics 字段示例**：

```json
{
  "temperature": 36.5,
  "heart_rate": 72,
  "oxygen": 98,
  "weight": 70.5,
  "mood": "😊 很好"
}
```

## API 接口

### 指标模板管理

#### GET /api/metric-templates

获取所有指标模板。

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "metric_key": "temperature",
      "metric_name": "体温",
      "data_type": "number",
      "unit": "℃",
      "min_value": 35.0,
      "max_value": 42.0,
      "decimal_places": 1,
      "icon": "🌡️",
      "is_system": true
    }
  ]
}
```

#### POST /api/metric-templates

创建自定义指标模板。

**请求**：
```json
{
  "metric_key": "my_metric",
  "metric_name": "我的指标",
  "data_type": "number",
  "unit": "单位",
  "min_value": 0,
  "max_value": 100,
  "decimal_places": 1,
  "icon": "📊",
  "description": "描述"
}
```

### 用户指标配置

#### GET /api/user-metrics

获取当前用户的指标配置。

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "metric_key": "temperature",
      "metric_name": "体温",
      "data_type": "number",
      "unit": "℃",
      "display_order": 1,
      "is_active": true
    }
  ]
}
```

#### POST /api/user-metrics

更新用户的指标配置。

**请求**：
```json
{
  "metrics": [
    { "metric_key": "temperature" },
    { "metric_key": "heart_rate" },
    { "metric_key": "oxygen" }
  ]
}
```

### 健康记录

#### GET /api/records

获取健康记录（返回动态格式）。

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "metrics": {
        "temperature": 36.5,
        "heart_rate": 72
      },
      "date": "2026-01-25T10:00:00Z"
    }
  ]
}
```

#### POST /api/records

创建健康记录（接受动态字段）。

**请求**：
```json
{
  "metrics": {
    "temperature": 36.5,
    "heart_rate": 72,
    "oxygen": 98
  }
}
```

## 常见问题

### Q: 迁移后旧数据会丢失吗？

不会。迁移脚本会：
1. 备份所有数据到 `health_records_backup` 表
2. 将数据转换为新格式，但保留旧列
3. 验证迁移前后记录数一致

### Q: 可以添加多少个指标？

理论上没有限制，但建议：
- 每个用户配置的指标不超过10个
- 指标过多会影响页面显示和输入体验

### Q: 可以修改系统预设指标吗？

不能直接修改系统预设指标（`is_system = true`），但可以：
1. 创建新的自定义指标
2. 不使用某个预设指标

### Q: 不同用户可以有不同的指标吗？

可以。每个用户的指标配置完全独立，互不影响。

### Q: 自定义指标会同步给其他用户吗？

会。创建的自定义指标会添加到全局模板库，其他用户也可以选择使用，但不会自动添加到他们的配置中。

### Q: 如何删除不需要的历史记录？

目前系统支持删除单条记录，后续会添加批量删除功能。

### Q: 数据类型可以修改吗？

创建后的指标类型不建议修改。如需调整，请：
1. 创建新的指标
2. 不再使用旧指标

## 技术说明

### JSONB 性能

- PostgreSQL 的 JSONB 类型经过优化，查询性能良好
- 已为 `metrics` 字段创建 GIN 索引
- 支持通过 JSON 路径查询特定指标

### 前端实现

- 使用原生 JavaScript Drag and Drop API 实现拖拽排序
- 动态生成表单字段，根据数据类型渲染不同的输入控件
- 响应式设计，适配移动端

### 数据验证

- 前端验证：根据指标配置验证输入范围
- 后端验证：双重验证确保数据安全
- 数值类型：验证 min/max 范围
- 选择类型：验证选项是否在预设列表中

## 更新日志

### v2.0.0 - 灵活指标系统

- ✨ 新增指标模板系统
- ✨ 新增用户指标配置功能
- ✨ 新增指标配置管理页面
- ✨ 主页面改为动态表单
- ✨ 支持自定义指标
- ✨ 支持多种数据类型（数值、文本、选择）
- ✨ 支持拖拽排序
- 🔄 数据存储改为 JSONB 格式
- 📝 完整的迁移脚本和文档
