import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { AppHeader } from '@/components/ui/AppHeader';
import { SuccessModal } from '@/components/ui/SuccessModal';
import {
  Skeleton,
  POSTerminalSkeleton,
  InventorySkeleton,
  SalesHistorySkeleton,
  DashboardSkeleton,
  StoreManagementSkeleton,
  BatchInspectionSkeleton,
  StoreUsersSkeleton,
} from '@/components/ui/Skeleton';
import { AuthProvider, AuthContext } from '@/context/AuthContext';

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      getMe: vi.fn(),
      getAccessibleStores: vi.fn().mockResolvedValue([
        {
          store_id: 's-1',
          store_name: 'Downtown Save Shop',
          name: 'Downtown Save Shop',
          code: 'DS-01',
          address: 'Downtown Kolkata',
          phone_number: '9876543210',
          email: 'downtown@saveshop.com',
          state: '19-West Bengal',
          is_active: true,
          created_at: '2026-01-01',
        },
        {
          store_id: 's-2',
          store_name: 'Uptown Save Shop',
          name: 'Uptown Save Shop',
          code: 'US-02',
          address: 'Uptown Kolkata',
          phone_number: '9876543211',
          email: 'uptown@saveshop.com',
          state: '19-West Bengal',
          is_active: true,
          created_at: '2026-01-01',
        },
      ]),
      switchStore: vi.fn().mockResolvedValue({
        user_id: 'u-1',
        email: 'cashier@saveshop.com',
        current_store_id: 's-2',
      }),
    },
  };
});

describe('components/ui/Button.tsx', () => {
  it('renders title and triggers onPress', () => {
    const onPressMock = vi.fn();
    render(<Button title="Click Me" onPress={onPressMock} />);

    const buttonText = screen.getByText('Click Me');
    expect(buttonText).toBeDefined();

    fireEvent.click(buttonText);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('renders all variants and sizes', () => {
    const { rerender } = render(<Button title="Submit" onPress={() => {}} variant="secondary" size="sm" />);
    expect(screen.getByText('Submit')).toBeDefined();

    rerender(<Button title="Submit" onPress={() => {}} variant="outline" size="lg" />);
    expect(screen.getByText('Submit')).toBeDefined();

    rerender(<Button title="Submit" onPress={() => {}} variant="danger" size="md" />);
    expect(screen.getByText('Submit')).toBeDefined();

    rerender(<Button title="Submit" onPress={() => {}} variant="success" />);
    expect(screen.getByText('Submit')).toBeDefined();
  });

  it('renders disabled state and ignores clicks', () => {
    const onPressMock = vi.fn();
    render(<Button title="Disabled" onPress={onPressMock} disabled />);

    fireEvent.click(screen.getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders loading state and displays activity indicator', () => {
    const onPressMock = vi.fn();
    render(<Button title="Loading" onPress={onPressMock} loading />);

    // Title should not be displayed when loading is true
    expect(screen.queryByText('Loading')).toBeNull();
  });

  it('renders custom icon', () => {
    render(
      <Button
        title="With Icon"
        onPress={() => {}}
        icon={<Text testID="custom-icon">Icon</Text>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeDefined();
  });
});

describe('components/ui/Input.tsx', () => {
  it('renders label and handles text change', () => {
    const onChangeMock = vi.fn();
    render(
      <Input
        label="Username"
        placeholder="Enter username"
        value="john"
        onChangeText={onChangeMock}
      />
    );

    expect(screen.getByText('Username')).toBeDefined();
    const input = screen.getByPlaceholderText('Enter username');
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: 'john_doe' } });
    expect(onChangeMock).toHaveBeenCalledWith('john_doe');
  });

  it('renders error message', () => {
    render(<Input label="Email" error="Invalid email address" />);
    expect(screen.getByText('Invalid email address')).toBeDefined();
  });

  it('renders icon and rightElement', () => {
    render(
      <Input
        icon={<Text testID="left-icon">Left</Text>}
        rightElement={<Text testID="right-icon">Right</Text>}
      />
    );
    expect(screen.getByTestId('left-icon')).toBeDefined();
    expect(screen.getByTestId('right-icon')).toBeDefined();
  });
});

describe('components/ui/Badge.tsx', () => {
  it('renders label with all variants and sizes', () => {
    const { rerender } = render(<Badge label="Active" variant="success" size="sm" />);
    expect(screen.getByText('Active')).toBeDefined();

    rerender(<Badge label="Warning" variant="warning" size="md" />);
    expect(screen.getByText('Warning')).toBeDefined();

    rerender(<Badge label="Danger" variant="danger" />);
    expect(screen.getByText('Danger')).toBeDefined();

    rerender(<Badge label="Primary" variant="primary" />);
    expect(screen.getByText('Primary')).toBeDefined();

    rerender(<Badge label="Purple" variant="purple" />);
    expect(screen.getByText('Purple')).toBeDefined();

    rerender(<Badge label="Neutral" variant="neutral" />);
    expect(screen.getByText('Neutral')).toBeDefined();
  });
});

describe('components/ui/Card.tsx', () => {
  it('renders children with elevated, outlined, and flat variants', () => {
    const { rerender } = render(
      <Card variant="elevated">
        <Text>Card Content</Text>
      </Card>
    );
    expect(screen.getByText('Card Content')).toBeDefined();

    rerender(
      <Card variant="outlined">
        <Text>Outlined Content</Text>
      </Card>
    );
    expect(screen.getByText('Outlined Content')).toBeDefined();

    rerender(
      <Card variant="flat">
        <Text>Flat Content</Text>
      </Card>
    );
    expect(screen.getByText('Flat Content')).toBeDefined();
  });
});

describe('components/ui/CalendarModal.tsx', () => {
  it('renders and supports month navigation and date selection', () => {
    const onSelectMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <CalendarModal
        visible={true}
        selectedDate="2026-06-15"
        onSelectDate={onSelectMock}
        onClose={onCloseMock}
        minDate="2026-01-01"
      />
    );

    expect(screen.getByText(/June 2026/i)).toBeDefined();

    // Click +1 Yr
    const yearBtn = screen.getByText('+1 Yr');
    fireEvent.click(yearBtn);
    expect(screen.getByText(/June 2027/i)).toBeDefined();

    // Select day 20
    const day20 = screen.getByText('20');
    fireEvent.click(day20);
    expect(onSelectMock).toHaveBeenCalledWith('2027-06-20');
  });

  it('renders embedded calendar mode', () => {
    render(
      <CalendarModal
        visible={true}
        embedded={true}
        selectedDate="2026-06-15"
        onSelectDate={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/June 2026/i)).toBeDefined();
  });
});

describe('components/ui/AppHeader.tsx', () => {
  it('renders active store and user profile avatar and opens modals', async () => {
    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>
    );

    // Initial default store pill
    const storePill = await screen.findByText(/Select Store|Downtown/i);
    expect(storePill).toBeDefined();

    // Click store pill to open switcher modal
    fireEvent.click(storePill);
    expect(screen.getByText('Switch Store')).toBeDefined();

    // Click Profile Avatar (initial 'U' or user letter)
    const avatar = screen.getByText(/^[A-Z]$/);
    fireEvent.click(avatar);
    expect(screen.getByText('User Session')).toBeDefined();
    expect(screen.getByText('Signed in with Google')).toBeDefined();
    const signOutBtn = screen.getByText('Sign Out');
    expect(signOutBtn).toBeDefined();
    fireEvent.click(signOutBtn);
  });

  it('renders Google user profile image when picture_url is present', async () => {
    const mockUser = {
      user_id: 'usr-1234-5678-9012',
      name: 'Google Verified User',
      email: 'verified@google.com',
      role: 'admin' as const,
      picture_url: 'https://lh3.googleusercontent.com/a/google-avatar-img',
      accessible_store_ids: [],
      created_at: new Date().toISOString(),
    };

    render(
      <AuthContext.Provider
        value={{
          user: mockUser,
          token: 'mock-token',
          activeStore: null,
          stores: [],
          isLoading: false,
          isAuthenticated: true,
          isAdmin: true,
          login: vi.fn(),
          logout: vi.fn(),
          switchStore: vi.fn(),
          refreshStores: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <AppHeader />
      </AuthContext.Provider>
    );

    // Profile button should render and be clickable
    const profileBtn = screen.getByLabelText('User profile and account settings');
    expect(profileBtn).toBeDefined();
    fireEvent.click(profileBtn);

    // Should display Google SSO user name, email, and Google badge in the modal
    expect(screen.getByText('Google Verified User')).toBeDefined();
    expect(screen.getByText('verified@google.com')).toBeDefined();
    expect(screen.getByText('Signed in with Google')).toBeDefined();
    expect(screen.getByText('ADMINISTRATOR')).toBeDefined();
  });
});

describe('components/ui/SuccessModal.tsx', () => {
  it('renders success modal with details and triggers onClose', () => {
    const onCloseMock = vi.fn();
    render(
      <SuccessModal
        visible={true}
        title="Operation Successful!"
        message="Your changes have been saved."
        badgeText="COMPLETED"
        details={[
          { label: 'Store', value: 'Test Store' },
          { label: 'Status', value: 'Active' },
        ]}
        primaryButtonText="Got It"
        onClose={onCloseMock}
      />
    );

    expect(screen.getByText('Operation Successful!')).toBeDefined();
    expect(screen.getByText('Your changes have been saved.')).toBeDefined();
    expect(screen.getByText('COMPLETED')).toBeDefined();
    expect(screen.getByText('Test Store')).toBeDefined();

    const btn = screen.getByText('Got It');
    fireEvent.click(btn);
    expect(onCloseMock).toHaveBeenCalled();
  });
});

describe('components/ui/Skeleton.tsx', () => {
  it('renders base skeleton with accessibility role and custom testID', () => {
    render(<Skeleton width={120} height={24} borderRadius={8} testID="custom-skeleton" />);
    const el = screen.getByTestId('custom-skeleton');
    expect(el).toBeDefined();
    expect(el.getAttribute('aria-label') || el.getAttribute('accessibilitylabel')).toBeTruthy();
  });

  it('renders sub-primitives: Text, Avatar, Badge, Button, Card', () => {
    const { unmount } = render(
      <Skeleton.Card testID="card-wrapper">
        <Skeleton.Avatar size={48} />
        <Skeleton.Badge width={70} />
        <Skeleton.Text lines={3} />
        <Skeleton.Button width={100} />
      </Skeleton.Card>
    );

    const skeletons = screen.getAllByRole('progressbar');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
    unmount();
  });

  it('renders POSTerminalSkeleton with category bar and product grid cards', () => {
    const { unmount } = render(<POSTerminalSkeleton cardCount={4} />);
    expect(screen.getByTestId('pos-terminal-skeleton')).toBeDefined();
    unmount();
  });

  it('renders InventorySkeleton with item cards', () => {
    const { unmount } = render(<InventorySkeleton itemCount={3} />);
    expect(screen.getByTestId('inventory-skeleton')).toBeDefined();
    unmount();
  });

  it('renders SalesHistorySkeleton with transaction cards', () => {
    const { unmount } = render(<SalesHistorySkeleton itemCount={3} />);
    expect(screen.getByTestId('sales-history-skeleton')).toBeDefined();
    unmount();
  });

  it('renders DashboardSkeleton with KPI overview grid and telemetry sections', () => {
    const { unmount } = render(<DashboardSkeleton />);
    expect(screen.getByTestId('dashboard-skeleton')).toBeDefined();
    unmount();
  });

  it('renders StoreManagementSkeleton with store card previews', () => {
    const { unmount } = render(<StoreManagementSkeleton storeCount={2} />);
    expect(screen.getByTestId('store-management-skeleton')).toBeDefined();
    unmount();
  });

  it('renders BatchInspectionSkeleton and StoreUsersSkeleton modal loaders', () => {
    const { unmount: u1 } = render(<BatchInspectionSkeleton count={2} />);
    expect(screen.getByTestId('batch-inspection-skeleton')).toBeDefined();
    u1();

    const { unmount: u2 } = render(<StoreUsersSkeleton count={2} />);
    expect(screen.getByTestId('store-users-skeleton')).toBeDefined();
    u2();
  });
});
