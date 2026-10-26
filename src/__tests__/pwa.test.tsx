import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { PWAInstallButton } from '@/components/ui/PWAInstallModal';

describe('PWA Functionality & Components', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('usePWAInstall hook', () => {
    it('initializes with default non-installed state in test environment', () => {
      const { result } = renderHook(() => usePWAInstall());
      expect(result.current.isInstalled).toBe(false);
      expect(result.current.canInstall).toBe(false);
    });

    it('detects standalone display mode as installed', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => usePWAInstall());
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.canInstall).toBe(false);
    });

    it('captures beforeinstallprompt event and triggers prompt', async () => {
      const { result } = renderHook(() => usePWAInstall());

      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event('beforeinstallprompt');
      Object.assign(mockEvent, {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      expect(result.current.canInstall).toBe(true);

      let success = false;
      await act(async () => {
        success = await result.current.promptInstall();
      });

      expect(mockPrompt).toHaveBeenCalled();
      expect(success).toBe(true);
      expect(result.current.isInstalled).toBe(true);
    });
  });

  describe('PWAInstallButton component', () => {
    it('renders button when canInstall is true and prompts on click', () => {
      const { container } = render(<PWAInstallButton variant="pill" />);

      // Initially null because no prompt event yet
      expect(screen.queryByText('Install App')).toBeNull();

      // Dispatch beforeinstallprompt
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event('beforeinstallprompt');
      Object.assign(mockEvent, {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      // Now it should be visible
      expect(screen.getByText('Install App')).toBeTruthy();

      // Click button
      fireEvent.click(screen.getByText('Install App'));
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('renders card variant correctly', () => {
      render(<PWAInstallButton variant="card" />);

      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event('beforeinstallprompt');
      Object.assign(mockEvent, {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
      });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      expect(screen.getByText('Install Save Shop App')).toBeTruthy();
      expect(screen.getByText('Fast, fullscreen offline-capable home screen app')).toBeTruthy();
    });
  });
});
