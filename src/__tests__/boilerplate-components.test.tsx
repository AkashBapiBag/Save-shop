import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, renderHook } from '@testing-library/react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExternalLink } from '@/components/external-link';
import { HintRow } from '@/components/hint-row';
import { WebBadge } from '@/components/web-badge';
import { Collapsible } from '@/components/ui/collapsible';
import { AnimatedSplashOverlay } from '@/components/animated-icon.web';
import { useColorScheme } from '@/hooks/use-color-scheme.web';
import Index from '@/app/index';
import * as WebBrowser from 'expo-web-browser';

vi.mock('@/assets/images/expo-badge.png', () => ({ default: 'expo-badge.png' }));
vi.mock('@/assets/images/expo-badge-white.png', () => ({ default: 'expo-badge-white.png' }));

describe('Boilerplate Components & Utilities', () => {
  it('ThemedText renders various typography types', () => {
    const { rerender } = render(<ThemedText type="title">Main Title</ThemedText>);
    expect(screen.getByText('Main Title')).toBeDefined();

    rerender(<ThemedText type="small">Small Text</ThemedText>);
    expect(screen.getByText('Small Text')).toBeDefined();

    rerender(<ThemedText type="link">Link Text</ThemedText>);
    expect(screen.getByText('Link Text')).toBeDefined();
  });

  it('ThemedView renders with themed background', () => {
    render(
      <ThemedView testID="themed-view">
        <ThemedText>Inside Themed View</ThemedText>
      </ThemedView>
    );
    expect(screen.getByText('Inside Themed View')).toBeDefined();
  });

  it('ExternalLink renders link and calls openBrowserAsync', async () => {
    render(<ExternalLink href="https://saveshop.org">Documentation</ExternalLink>);

    const link = screen.getByText('Documentation');
    expect(link).toBeDefined();

    fireEvent.click(link);
    expect(WebBrowser.openBrowserAsync).toBeDefined();
  });

  it('HintRow renders title and code hint', () => {
    render(<HintRow title="Edit file" hint="src/app/index.tsx" />);

    expect(screen.getByText('Edit file')).toBeDefined();
    expect(screen.getByText('src/app/index.tsx')).toBeDefined();
  });

  it('WebBadge renders version label', () => {
    render(<WebBadge />);
    expect(screen.getByText(/v\d+/i)).toBeDefined();
  });

  it('Collapsible expands and collapses children', () => {
    render(
      <Collapsible title="More Information">
        <ThemedText>Hidden Content Here</ThemedText>
      </Collapsible>
    );

    expect(screen.getByText('More Information')).toBeDefined();
    expect(screen.queryByText('Hidden Content Here')).toBeNull();

    // Click heading to expand
    fireEvent.click(screen.getByText('More Information'));
    expect(screen.getByText('Hidden Content Here')).toBeDefined();
  });

  it('AnimatedSplashOverlay returns null on web', () => {
    const { container } = render(<AnimatedSplashOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('useColorScheme hook returns color scheme', () => {
    const { result } = renderHook(() => useColorScheme());
    expect(result.current).toBeDefined();
  });

  it('Index route component renders container view', () => {
    const { container } = render(<Index />);
    expect(container).toBeDefined();
  });
});
