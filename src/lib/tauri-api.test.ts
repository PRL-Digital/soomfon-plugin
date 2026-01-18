/**
 * Tauri API Adapter Tests
 *
 * Tests for the Tauri-to-Electron API bridge that enables:
 * - Device API (status, connect, brightness, images, events)
 * - Profile API (CRUD operations, active profile)
 * - Config API (settings, integrations)
 * - Action API (execute, bindings)
 * - Auto-launch API (status, enable/disable)
 * - Dialog API (file picker)
 *
 * Why these tests matter:
 * The Tauri API adapter is the bridge between React frontend and Tauri backend.
 * Bugs in parameter mapping, event subscription, or response transformation
 * could break the entire application UI. Testing ensures the API contract
 * between frontend and backend is maintained.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @tauri-apps/api modules before importing the module under test
const mockInvoke = vi.fn();
const mockListen = vi.fn();
const mockGetVersion = vi.fn();
const mockGetName = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}));

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: mockGetVersion,
  getName: mockGetName,
}));

describe('tauriAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for listen that returns a function
    mockListen.mockResolvedValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToEvent helper', () => {
    it('should call listen with correct event name', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();

      tauriAPI.device.onConnected(callback);

      // Wait for async listen to be called
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListen).toHaveBeenCalledWith('device:connected', expect.any(Function));
    });

    it('should return unsubscribe function', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const unsubscribe = tauriAPI.device.onConnected(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call unlisten when unsubscribed', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const unsubscribe = tauriAPI.device.onConnected(callback);

      // Wait for async listen to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      unsubscribe();

      expect(mockUnlisten).toHaveBeenCalled();
    });

    it('should handle unsubscribe before listen completes', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();
      const mockUnlisten = vi.fn();

      // Delay the listen resolution
      mockListen.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(mockUnlisten), 50);
      }));

      const unsubscribe = tauriAPI.device.onConnected(callback);
      unsubscribe(); // Unsubscribe immediately before listen completes

      // Wait for listen to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still call unlisten when it finally resolves
      expect(mockUnlisten).toHaveBeenCalled();
    });
  });

  describe('deviceAPI', () => {
    it('should get device status and transform response', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({
        state: 'connected',
        device_info: {
          vendor_id: 0x1500,
          product_id: 0x3001,
          path: '/dev/hidraw0',
          serial_number: 'ABC123',
          manufacturer: 'SOOMFON',
          product: 'Controller',
          release: 1,
          interface_number: 0,
        },
      });

      const status = await tauriAPI.device.getStatus();

      expect(mockInvoke).toHaveBeenCalledWith('get_device_status');
      expect(status.connectionState).toBe('connected');
      expect(status.isConnected).toBe(true);
      expect(status.deviceInfo?.vendorId).toBe(0x1500);
      expect(status.deviceInfo?.productId).toBe(0x3001);
      expect(status.deviceInfo?.serialNumber).toBe('ABC123');
    });

    it('should handle null device_info', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({
        state: 'disconnected',
        device_info: null,
      });

      const status = await tauriAPI.device.getStatus();

      expect(status.connectionState).toBe('disconnected');
      expect(status.isConnected).toBe(false);
      expect(status.deviceInfo).toBeNull();
    });

    it('should call connect_device', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.device.connect();

      expect(mockInvoke).toHaveBeenCalledWith('connect_device');
    });

    it('should call disconnect_device', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.device.disconnect();

      expect(mockInvoke).toHaveBeenCalledWith('disconnect_device');
    });

    it('should call set_brightness with level', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.device.setBrightness(75);

      expect(mockInvoke).toHaveBeenCalledWith('set_brightness', { level: 75 });
    });

    it('should call set_button_image with index and data', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.device.setButtonImage(2, 'base64data...');

      expect(mockInvoke).toHaveBeenCalledWith('set_button_image', {
        buttonIndex: 2,
        imageData: 'base64data...',
      });
    });

    it('should set up button press listener', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();

      tauriAPI.device.onButtonPress(callback);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListen).toHaveBeenCalledWith('device:buttonPress', expect.any(Function));
    });

    it('should set up button release listener', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();

      tauriAPI.device.onButtonRelease(callback);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListen).toHaveBeenCalledWith('device:buttonRelease', expect.any(Function));
    });

    it('should set up encoder rotate listener', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();

      tauriAPI.device.onEncoderRotate(callback);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListen).toHaveBeenCalledWith('device:encoderRotate', expect.any(Function));
    });

    it('should set up encoder press listener', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();

      tauriAPI.device.onEncoderPress(callback);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListen).toHaveBeenCalledWith('device:encoderPress', expect.any(Function));
    });
  });

  describe('profileAPI', () => {
    it('should get all profiles', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const mockProfiles = [{ id: '1', name: 'Profile 1' }, { id: '2', name: 'Profile 2' }];
      mockInvoke.mockResolvedValue(mockProfiles);

      const profiles = await tauriAPI.profile.getAll();

      expect(mockInvoke).toHaveBeenCalledWith('get_profiles');
      expect(profiles).toEqual(mockProfiles);
    });

    it('should get active profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const mockProfile = { id: '1', name: 'Active Profile' };
      mockInvoke.mockResolvedValue(mockProfile);

      const profile = await tauriAPI.profile.getActive();

      expect(mockInvoke).toHaveBeenCalledWith('get_active_profile');
      expect(profile).toEqual(mockProfile);
    });

    it('should set active profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.profile.setActive('profile-123');

      expect(mockInvoke).toHaveBeenCalledWith('set_active_profile', { id: 'profile-123' });
    });

    it('should create profile with name and description', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const mockProfile = { id: 'new-id', name: 'New Profile' };
      mockInvoke.mockResolvedValue(mockProfile);

      const profile = await tauriAPI.profile.create('New Profile', 'A description');

      expect(mockInvoke).toHaveBeenCalledWith('create_profile', {
        name: 'New Profile',
        description: 'A description',
      });
      expect(profile).toEqual(mockProfile);
    });

    it('should create profile without description', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({ id: 'new-id', name: 'Simple' });

      await tauriAPI.profile.create('Simple');

      expect(mockInvoke).toHaveBeenCalledWith('create_profile', {
        name: 'Simple',
        description: undefined,
      });
    });

    it('should update profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const updates = { name: 'Updated Name', description: 'Updated' };
      mockInvoke.mockResolvedValue({ id: '1', ...updates });

      await tauriAPI.profile.update('1', updates);

      expect(mockInvoke).toHaveBeenCalledWith('update_profile', { id: '1', updates });
    });

    it('should delete profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.profile.delete('profile-to-delete');

      expect(mockInvoke).toHaveBeenCalledWith('delete_profile', { id: 'profile-to-delete' });
    });

    it('should duplicate profile via import_profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({ id: 'new-id', name: 'Copy of Profile' });

      await tauriAPI.profile.duplicate('original-id', 'Copy of Profile');

      expect(mockInvoke).toHaveBeenCalledWith('import_profile', {
        id: 'original-id',
        newName: 'Copy of Profile',
      });
    });

    it('should set up profile changed listener', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();

      tauriAPI.profile.onChanged(callback);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListen).toHaveBeenCalledWith('profile:changed', expect.any(Function));
    });
  });

  describe('configAPI', () => {
    it('should get full config by assembling from multiple calls', async () => {
      const { tauriAPI } = await import('./tauri-api');
      // Implementation uses Promise.all([get_app_settings, get_profiles, get_active_profile])
      mockInvoke
        .mockResolvedValueOnce({ brightness: 80, start_minimized: false, auto_launch: false, home_assistant: null, node_red: null }) // get_app_settings
        .mockResolvedValueOnce([{ id: '1', name: 'P1' }]) // get_profiles
        .mockResolvedValueOnce({ id: '1', name: 'P1' }); // get_active_profile

      const config = await tauriAPI.config.get();

      expect(config.version).toBe(1);
      expect(config.activeProfileId).toBe('1');
    });

    it('should get app settings', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({ theme: 'light', startMinimized: false });

      const settings = await tauriAPI.config.getAppSettings();

      expect(mockInvoke).toHaveBeenCalledWith('get_app_settings');
    });

    it('should set app settings', async () => {
      const { tauriAPI } = await import('./tauri-api');
      // Implementation first gets current settings, then merges
      mockInvoke
        .mockResolvedValueOnce({ brightness: 80, auto_launch: false }) // get_app_settings
        .mockResolvedValueOnce(undefined); // set_app_settings

      await tauriAPI.config.setAppSettings({
        launchOnStartup: true,
        minimizeToTray: true,
        closeToTray: true,
        theme: 'dark',
        language: 'en',
      });

      // Only auto_launch is stored in backend, other settings are frontend-only
      expect(mockInvoke).toHaveBeenCalledWith('set_app_settings', {
        settings: expect.objectContaining({ auto_launch: true }),
      });
    });

    it('should reset config to defaults', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.config.reset();

      // Implementation sends backend format (snake_case) with backend default values
      expect(mockInvoke).toHaveBeenCalledWith('set_app_settings', {
        settings: {
          brightness: 80,
          start_minimized: false,
          auto_launch: false,
          home_assistant: null,
          node_red: null,
        },
      });
    });

    it('should set up config changed listener', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const callback = vi.fn();

      tauriAPI.config.onChanged(callback);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListen).toHaveBeenCalledWith('config:changed', expect.any(Function));
    });
  });

  describe('actionAPI', () => {
    it('should execute action', async () => {
      const { tauriAPI } = await import('./tauri-api');
      const mockResult = { status: 'success', actionId: 'action-1' };
      mockInvoke.mockResolvedValue(mockResult);

      const action = { id: 'action-1', type: 'keyboard', key: 'a' };
      const result = await tauriAPI.action.execute(action as any);

      expect(mockInvoke).toHaveBeenCalledWith('execute_action', { action });
      expect(result).toEqual(mockResult);
    });

    it('should get bindings from active profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({
        id: 'profile-1',
        name: 'Test',
        buttons: [
          { index: 0, action: { id: 'a1', type: 'keyboard' } },
          { index: 1, longPressAction: { id: 'a2', type: 'media' } },
        ],
        encoders: [
          {
            index: 0,
            clockwiseAction: { id: 'a3', type: 'media' },
            counterClockwiseAction: { id: 'a4', type: 'media' },
            pressAction: { id: 'a5', type: 'system' },
            longPressAction: { id: 'a6', type: 'http' },
          },
        ],
      });

      const bindings = await tauriAPI.action.getBindings();

      expect(mockInvoke).toHaveBeenCalledWith('get_active_profile');
      // Should have: 2 button bindings + 4 encoder bindings = 6 total
      expect(bindings.length).toBe(6);
      expect(bindings.some(b => b.trigger === 'press' && b.elementType === 'lcdButton')).toBe(true);
      expect(bindings.some(b => b.trigger === 'longPress' && b.elementType === 'lcdButton')).toBe(true);
      expect(bindings.some(b => b.trigger === 'rotateCW' && b.elementType === 'encoder')).toBe(true);
      expect(bindings.some(b => b.trigger === 'rotateCCW' && b.elementType === 'encoder')).toBe(true);
    });

    it('should handle profile with no buttons or encoders', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({
        id: 'empty-profile',
        name: 'Empty',
        buttons: null,
        encoders: undefined,
      });

      const bindings = await tauriAPI.action.getBindings();

      expect(bindings).toEqual([]);
    });

    it('should save button binding to profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke
        .mockResolvedValueOnce({
          id: 'profile-1',
          buttons: [],
          encoders: [],
        })
        .mockResolvedValueOnce(undefined); // update_profile

      await tauriAPI.action.saveBinding({
        target: { elementType: 'lcdButton', elementIndex: 0, trigger: 'press' },
        action: { id: 'new-action', type: 'keyboard' } as any,
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_profile', expect.objectContaining({
        id: 'profile-1',
      }));
    });

    it('should save encoder binding to profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke
        .mockResolvedValueOnce({
          id: 'profile-1',
          buttons: [],
          encoders: [],
        })
        .mockResolvedValueOnce(undefined);

      await tauriAPI.action.saveBinding({
        target: { elementType: 'encoder', elementIndex: 0, trigger: 'rotateCW' },
        action: { id: 'encoder-action', type: 'media' } as any,
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_profile', expect.objectContaining({
        id: 'profile-1',
        updates: expect.objectContaining({
          encoders: expect.arrayContaining([
            expect.objectContaining({
              index: 0,
              clockwiseAction: expect.objectContaining({ id: 'encoder-action' }),
            }),
          ]),
        }),
      }));
    });

    it('should delete button binding from profile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke
        .mockResolvedValueOnce({
          id: 'profile-1',
          buttons: [{ index: 0, action: { id: 'to-delete', type: 'keyboard' } }],
          encoders: [],
        })
        .mockResolvedValueOnce(undefined);

      await tauriAPI.action.deleteBinding({
        target: { elementType: 'lcdButton', elementIndex: 0, trigger: 'press' },
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_profile', expect.any(Object));
    });
  });

  describe('autoLaunchAPI', () => {
    it('should get auto-launch status', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke
        .mockResolvedValueOnce(true) // get_auto_launch
        .mockResolvedValueOnce({ start_minimized: true }); // get_app_settings

      const status = await tauriAPI.autoLaunch.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.startMinimized).toBe(true);
    });

    it('should set auto-launch enabled', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.autoLaunch.setEnabled(true);

      expect(mockInvoke).toHaveBeenCalledWith('set_auto_launch', { enabled: true });
    });

    it('should set auto-launch with startMinimized option', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke
        .mockResolvedValueOnce(undefined) // set_auto_launch
        .mockResolvedValueOnce({ theme: 'dark' }) // get_app_settings
        .mockResolvedValueOnce(undefined); // set_app_settings

      await tauriAPI.autoLaunch.setEnabled(true, true);

      expect(mockInvoke).toHaveBeenCalledWith('set_auto_launch', { enabled: true });
      expect(mockInvoke).toHaveBeenCalledWith('set_app_settings', {
        settings: expect.objectContaining({ start_minimized: true }),
      });
    });
  });

  describe('dialogAPI', () => {
    it('should open file dialog with options', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(['/path/to/file.png']);

      const files = await tauriAPI.dialog.openFile({
        title: 'Select Image',
        filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
      });

      expect(mockInvoke).toHaveBeenCalledWith('open_file_dialog', {
        options: {
          title: 'Select Image',
          filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
        },
      });
      expect(files).toEqual(['/path/to/file.png']);
    });

    it('should open file dialog without options', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue([]);

      await tauriAPI.dialog.openFile();

      expect(mockInvoke).toHaveBeenCalledWith('open_file_dialog', { options: undefined });
    });
  });

  describe('app info', () => {
    it('should expose getVersion from Tauri', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockGetVersion.mockResolvedValue('1.2.3');

      const version = await tauriAPI.getVersion();

      expect(version).toBe('1.2.3');
    });

    it('should expose getName from Tauri', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockGetName.mockResolvedValue('SOOMFON Controller');

      const name = await tauriAPI.getName();

      expect(name).toBe('SOOMFON Controller');
    });
  });

  describe('legacy openFileDialog', () => {
    it('should work as alias for dialog.openFile', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(['/file.png']);

      const files = await tauriAPI.openFileDialog({ title: 'Test' });

      expect(mockInvoke).toHaveBeenCalledWith('open_file_dialog', { options: { title: 'Test' } });
    });
  });

  describe('generic invoke', () => {
    it('should map Electron channel to Tauri command', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue({ state: 'connected' });

      await tauriAPI.invoke('device:getStatus');

      expect(mockInvoke).toHaveBeenCalledWith('get_device_status', undefined);
    });

    it('should pass first argument to invoke', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue(undefined);

      await tauriAPI.invoke('device:setBrightness', 80);

      expect(mockInvoke).toHaveBeenCalledWith('set_brightness', 80);
    });

    it('should pass through unknown channels', async () => {
      const { tauriAPI } = await import('./tauri-api');
      mockInvoke.mockResolvedValue('result');

      await tauriAPI.invoke('unknown:channel', 'arg1');

      expect(mockInvoke).toHaveBeenCalledWith('unknown:channel', 'arg1');
    });
  });
});
