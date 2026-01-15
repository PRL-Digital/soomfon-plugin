# Phase 6: Integrations

## Objective

Build dedicated integration modules for:
1. Home Assistant - Smart home control
2. Node-RED - IoT workflow automation

These provide higher-level abstractions than raw HTTP actions for better user experience.

## Prerequisites

- Phase 5 completed with working GUI
- HTTP action handler functional

## Tasks

### Task 6.1: Home Assistant Client
**REST API client for Home Assistant**

**Actions:**
1. Create axios-based HTTP client
2. Implement connection test
3. Implement entity listing
4. Implement state retrieval
5. Implement service calls
6. Add convenience methods for common operations

**Files to Create:**
- `src/core/integrations/home-assistant.ts`

**Required Outcome:**
```typescript
const ha = new HomeAssistantClient();
ha.configure('http://homeassistant.local:8123', 'long-lived-token');

// Test connection
const connected = await ha.checkConnection();

// Get entities
const entities = await ha.getStates();

// Toggle light
await ha.toggleLight('light.living_room');

// Set brightness
await ha.setLightBrightness('light.bedroom', 50);

// Run script
await ha.runScript('script.goodnight');

// Call any service
await ha.callService({
  domain: 'switch',
  service: 'turn_on',
  target: { entity_id: 'switch.fan' }
});
```

**Verification:**
- Connection test returns true when configured correctly
- Entity list shows all Home Assistant entities
- Light toggle works
- Brightness adjustment works

---

### Task 6.2: Home Assistant Action Type
**Specialized action type for HA operations**

**Actions:**
1. Define HomeAssistantAction type
2. Create handler that uses HA client
3. Add to action type union
4. Create UI form for HA actions

**Files to Create:**
- `src/core/actions/handlers/home-assistant-handler.ts`
- `src/renderer/components/ActionEditor/HomeAssistantAction.tsx`

**Required Outcome:**
```typescript
interface HomeAssistantAction extends BaseAction {
  type: 'home_assistant';
  params: {
    operation: 'toggle' | 'turn_on' | 'turn_off' | 'set_brightness' |
               'run_script' | 'trigger_automation' | 'custom';
    entityId?: string;
    brightness?: number;
    customService?: {
      domain: string;
      service: string;
      data?: Record<string, unknown>;
    };
  };
}
```

**UI Form:**
```
┌─ Home Assistant Action ─────────┐
│                                 │
│ Operation: [Toggle Light    ▼]  │
│                                 │
│ Entity: [light.living_room  ▼]  │
│         (dropdown populated)    │
│                                 │
│ [Test Action]                   │
└─────────────────────────────────┘
```

---

### Task 6.3: Home Assistant Settings UI
**Configuration interface for HA connection**

**Actions:**
1. Create URL input field
2. Create access token input (password field)
3. Add connection test button
4. Show entity count on success
5. Add link to HA token generation page

**Files to Update:**
- `src/renderer/components/Settings/IntegrationSettings.tsx`

**Required Outcome:**
```
┌─ Home Assistant ────────────────────────┐
│                                         │
│ URL: [http://homeassistant.local:8123]  │
│                                         │
│ Access Token: [••••••••••••••••]        │
│ (How to get token?)                     │
│                                         │
│ [Test Connection]                       │
│                                         │
│ Status: ✅ Connected (142 entities)     │
└─────────────────────────────────────────┘
```

---

### Task 6.4: Node-RED Webhook Client
**HTTP client for Node-RED webhook nodes**

**Actions:**
1. Create configurable base URL
2. Support optional authentication
3. Implement generic webhook trigger
4. Add convenience methods for common payloads

**Files to Create:**
- `src/core/integrations/node-red.ts`

**Required Outcome:**
```typescript
const nodeRed = new NodeRedClient();
nodeRed.configure('http://localhost:1880', 'optional-auth-token');

// Send to any endpoint
await nodeRed.triggerWebhook('/myflow/button', 'button_pressed', {
  button: 1,
  profile: 'gaming'
});

// Convenience methods
await nodeRed.sendButtonPress(1);
await nodeRed.sendEncoderEvent(0, 'rotate', 'cw');
await nodeRed.sendCustomEvent('custom-event', { key: 'value' });
```

**Verification:**
- Webhook triggers Node-RED flow
- Payload arrives correctly
- Auth header sent when configured

---

### Task 6.5: Node-RED Action Type
**Specialized action type for Node-RED**

**Actions:**
1. Define NodeRedAction type
2. Create handler using Node-RED client
3. Add UI form for configuration

**Files to Create:**
- `src/core/actions/handlers/node-red-handler.ts`
- `src/renderer/components/ActionEditor/NodeRedAction.tsx`

**Required Outcome:**
```typescript
interface NodeRedAction extends BaseAction {
  type: 'node_red';
  params: {
    endpoint: string;      // e.g., '/myflow/trigger'
    eventName: string;     // e.g., 'button_pressed'
    payload?: Record<string, unknown>;
  };
}
```

**UI Form:**
```
┌─ Node-RED Webhook ──────────────┐
│                                 │
│ Endpoint: [/flow/button    ]    │
│                                 │
│ Event Name: [button_pressed]    │
│                                 │
│ Payload (JSON):                 │
│ ┌─────────────────────────────┐ │
│ │ {                           │ │
│ │   "action": "toggle"        │ │
│ │ }                           │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Test Webhook]                  │
└─────────────────────────────────┘
```

---

### Task 6.6: Node-RED Settings UI
**Configuration interface for Node-RED connection**

**Actions:**
1. Create base URL input
2. Create optional auth token input
3. Add connection test (send test webhook)

**Files to Update:**
- `src/renderer/components/Settings/IntegrationSettings.tsx`

**Required Outcome:**
```
┌─ Node-RED ──────────────────────────────┐
│                                         │
│ Webhook Base URL: [http://localhost:1880│
│                                         │
│ Auth Token: [optional...              ] │
│                                         │
│ [Send Test Webhook]                     │
│                                         │
│ Status: ✅ Last test successful         │
└─────────────────────────────────────────┘
```

---

### Task 6.7: Entity Browser Dialog
**Browse Home Assistant entities in UI**

**Actions:**
1. Create modal dialog
2. Fetch and display entity list
3. Add search/filter
4. Group by domain (light, switch, script, etc.)
5. Select entity and return to form

**Files to Create:**
- `src/renderer/components/common/EntityBrowser.tsx`

**Required Outcome:**
Modal showing:
- Search box
- Grouped entity list
- Click to select and close

---

### Task 6.8: Integration Presets
**Quick setup templates for common integrations**

**Actions:**
1. Create preset definitions
2. Add "Add Preset" button to action editor
3. Include presets for:
   - Toggle light
   - Play/pause media
   - Run HA script
   - Trigger Node-RED flow

**Files to Create:**
- `src/core/integrations/presets.ts`
- `src/renderer/components/ActionEditor/PresetSelector.tsx`

**Required Outcome:**
Quick buttons to add pre-configured actions

---

## Deliverables

| File | Purpose |
|------|---------|
| `src/core/integrations/home-assistant.ts` | HA REST client |
| `src/core/integrations/node-red.ts` | Node-RED webhook client |
| `src/core/integrations/presets.ts` | Action presets |
| `src/core/actions/handlers/home-assistant-handler.ts` | HA action handler |
| `src/core/actions/handlers/node-red-handler.ts` | Node-RED action handler |
| `src/renderer/components/ActionEditor/HomeAssistantAction.tsx` | HA action form |
| `src/renderer/components/ActionEditor/NodeRedAction.tsx` | Node-RED action form |
| `src/renderer/components/ActionEditor/PresetSelector.tsx` | Preset picker |
| `src/renderer/components/common/EntityBrowser.tsx` | Entity browser modal |

## Updated Action Types

```typescript
type Action =
  | KeyboardAction
  | LaunchAction
  | ScriptAction
  | HttpAction
  | MediaAction
  | SystemAction
  | ProfileAction
  | TextAction
  | HomeAssistantAction  // NEW
  | NodeRedAction;       // NEW
```

## File Structure After Phase 6

```
src/
├── core/
│   ├── integrations/
│   │   ├── home-assistant.ts
│   │   ├── node-red.ts
│   │   └── presets.ts
│   └── actions/
│       └── handlers/
│           ├── ...existing handlers...
│           ├── home-assistant-handler.ts
│           └── node-red-handler.ts
└── renderer/
    └── components/
        ├── ActionEditor/
        │   ├── ...existing forms...
        │   ├── HomeAssistantAction.tsx
        │   ├── NodeRedAction.tsx
        │   └── PresetSelector.tsx
        └── common/
            └── EntityBrowser.tsx
```

## Verification Checklist

- [ ] Home Assistant connection test works
- [ ] HA entity list loads correctly
- [ ] HA light toggle from button press works
- [ ] HA brightness control works
- [ ] HA script execution works
- [ ] Node-RED webhook receives button events
- [ ] Node-RED custom payload works
- [ ] Entity browser shows all HA entities
- [ ] Entity browser search works
- [ ] Presets add correctly configured actions

## Example Home Assistant Setup

In Home Assistant `configuration.yaml`:
```yaml
# Enable API
api:
```

Generate long-lived access token:
1. Go to Profile (bottom left)
2. Scroll to "Long-Lived Access Tokens"
3. Create token and copy

## Example Node-RED Flow

```json
[
  {
    "type": "http in",
    "url": "/soomfon/button",
    "method": "post",
    "name": "Button Webhook"
  },
  {
    "type": "switch",
    "property": "payload.button",
    "rules": [
      { "t": "eq", "v": "0" },
      { "t": "eq", "v": "1" }
    ]
  }
]
```

## Next Phase

Once integrations are complete, proceed to [Phase 7: Polish & Distribution](./07-polish-distribution.md) for final refinements.
