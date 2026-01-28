# Smart Farm Dashboard - Component Architecture

## 📁 Project Structure

```
src/
├── components/
│   ├── index.js                    # Export all components
│   ├── Card.jsx                    # Simple value display card
│   ├── StatCard.jsx                # Enhanced stat card with icon
│   ├── SensorGauge.jsx             # ✨ NEW: Advanced gauge with progress bar
│   ├── NPK.jsx                     # NPK soil nutrients display
│   ├── NPKCard.jsx                 # Enhanced NPK card
│   ├── TH.jsx                      # Temperature & Humidity
│   ├── RelayStatus.jsx             # Device status indicator
│   ├── RelayControl.jsx            # Device control interface
│   ├── AutomationPanel.jsx         # Automation settings
│   ├── DeviceControlCard.jsx       # ✨ NEW: Interactive device control
│   ├── DeviceSettingsModal.jsx     # ✨ NEW: Device configuration modal
│   └── SimpleLineChart.jsx         # ✨ NEW: Recharts line chart wrapper
│
├── pages/
│   ├── MonitorPage.jsx             # Real-time sensor display
│   ├── ControlPage.jsx             # Device control interface
│   ├── GraphPage.jsx               # Trend charts
│   ├── HistoryPage.jsx             # Historical data table
│   └── DashboardPage.jsx           # ✨ NEW: Unified dashboard
│
├── hooks/
│   ├── index.js                    # Export all hooks
│   └── useMqttData.js              # MQTT data management
│
└── App.jsx                         # Main routing component
```

## 🎨 New Components Overview

### 1. **SensorGauge** (`src/components/SensorGauge.jsx`)
Advanced sensor value display with progress bar visualization.

```jsx
<SensorGauge
  title="Temperature"
  value={25.5}
  unit="°C"
  min={0}
  max={50}
  color="red"
  icon={Thermometer}
  isAlert={false}
/>
```

**Props:**
- `title` (string): Display name
- `value` (number): Current sensor value
- `unit` (string): Unit of measurement
- `min` (number): Minimum value for scale
- `max` (number): Maximum value for scale
- `color` (string): Color theme (blue, red, green, orange, purple, yellow, teal)
- `icon` (ReactComponent): Optional icon from lucide-react
- `isAlert` (boolean): Show alert styling if true

---

### 2. **DeviceControlCard** (`src/components/DeviceControlCard.jsx`)
Interactive device control card with gradient background and settings button.

```jsx
<DeviceControlCard
  name="Water Pump"
  isOn={true}
  isAutoMode={false}
  isConnected={true}
  onToggle={() => handleToggle(0)}
  onOpenSettings={() => handleSettings(device)}
  icon={Droplets}
  color="blue"
/>
```

**Props:**
- `name` (string): Device name
- `isOn` (boolean): Current device state
- `isAutoMode` (boolean): Whether in auto mode (disables manual control)
- `isConnected` (boolean): Device connection status
- `onToggle` (function): Called when toggle button clicked
- `onOpenSettings` (function): Called when settings button clicked
- `icon` (ReactComponent): Lucide icon
- `color` (string): Theme color

---

### 3. **SimpleLineChart** (`src/components/SimpleLineChart.jsx`)
Wrapper for Recharts LineChart with sensible defaults.

```jsx
<SimpleLineChart
  data={historyData}
  dataKey="temp"
  title="Temperature Trend"
  color="#ef4444"
  height={300}
  isLoading={false}
/>
```

**Props:**
- `data` (array): Chart data points
- `dataKey` (string): Data key to display (e.g., "temp")
- `title` (string): Chart title
- `color` (string): Line color (hex)
- `height` (number): Chart height in pixels
- `showGrid` (boolean): Show gridlines
- `isLoading` (boolean): Show loading state

---

### 4. **DeviceSettingsModal** (`src/components/DeviceSettingsModal.jsx`)
Modal for configuring device automation rules (threshold & condition).

```jsx
<DeviceSettingsModal
  isOpen={true}
  device={{ name: "Pump", config: { target: 50, condition: '<' } }}
  currentValue={45}
  onClose={() => setOpen(false)}
  onSave={(config) => handleSave(config)}
/>
```

**Props:**
- `isOpen` (boolean): Modal visibility
- `device` (object): Device data with config
- `currentValue` (number): Current sensor value
- `onClose` (function): Close modal callback
- `onSave` (function): Save callback with new config

---

## 📊 DashboardPage Features

The new unified dashboard (`src/pages/DashboardPage.jsx`) includes:

### 1. **Connection Status**
- Real-time connection indicator
- Green (connected) / Red (disconnected) badge

### 2. **Sensor Gauges Section**
- 8 sensor displays with progress bars
- Temperature, Humidity, Soil, Light, pH, CO2, NPK
- Color-coded by measurement type

### 3. **Device Control Section**
- 4 interactive device cards
- Gradient backgrounds when active
- Settings button for each device (when not in Auto mode)
- Locked state indicator in Auto mode

### 4. **Mode Selector**
- Quick toggle between AUTO/MANUAL modes
- Disabled when disconnected

### 5. **History Chart**
- 24-hour temperature trend visualization
- Auto-refreshes every 60 seconds
- Loading state support

---

## 🔗 Integration with Existing Code

### useMqttData Hook
The components use the existing `useMqttData` hook which provides:

```js
const {
  data,              // { air: {temp, hum}, soil: {...}, env: {...} }
  controlStatus,     // { mode, relays: [], config: [] }
  sendCommand,       // (cmd) => send MQTT command
  sendConfig,        // (idx, rule) => save device config
  connectionStatus   // "Connected" / "Disconnected"
} = useMqttData();
```

### API Endpoints
The app communicates with Flask backend:

- `GET /api/data` - Get sensor & relay status
- `POST /api/mode` - Set AUTO/MANUAL mode
- `POST /api/relay` - Control individual relay
- `POST /api/config` - Save automation config
- `GET /api/sheet-history` - Fetch historical data

---

## 🎨 Color System

Supported colors across all components:
- `blue` - Blue gradient
- `red` - Red gradient
- `green` - Green gradient
- `orange` - Orange gradient
- `purple` - Purple gradient
- `yellow` - Yellow gradient
- `teal` - Teal gradient
- `indigo` - Indigo gradient

---

## 📱 Responsive Design

All components are mobile-first and work on:
- 7" touch screens (480×800)
- Tablets (768px+)
- Desktop displays (1920px+)

Grid layouts adapt automatically:
```jsx
className="grid grid-cols-2 lg:grid-cols-4 gap-4"
```

---

## 🚀 Usage Example

### Using DashboardPage (Recommended)
```jsx
<Route path="/dashboard" element={<DashboardPage />} />
```

### Using Individual Components
```jsx
import {
  SensorGauge,
  DeviceControlCard,
  SimpleLineChart,
  DeviceSettingsModal
} from './components';

// Then use them directly in your pages
```

---

## 📝 File Summary

| File | Purpose | Status |
|------|---------|--------|
| `SensorGauge.jsx` | Sensor value display with gauge | ✨ NEW |
| `DeviceControlCard.jsx` | Interactive device control | ✨ NEW |
| `SimpleLineChart.jsx` | Chart wrapper | ✨ NEW |
| `DeviceSettingsModal.jsx` | Configuration modal | ✨ NEW |
| `DashboardPage.jsx` | Main dashboard page | ✨ NEW |
| `components/index.js` | Component exports | ✨ NEW |
| Other components | Existing components | Unchanged |

---

## 🔄 Update History

**27 Jan 2026:**
- ✅ Refactored existing components
- ✅ Created 4 new reusable components
- ✅ Added DashboardPage with full integration
- ✅ Updated App.jsx with new routes
- ✅ Rebuilt application with npm run build
- ✅ Integrated with existing useMqttData hook
