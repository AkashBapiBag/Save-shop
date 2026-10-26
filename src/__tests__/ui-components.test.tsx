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
import { AuthProvider } from '@/context/AuthContext';

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
    const signOutBtn = screen.getByText('Sign Out');
    expect(signOutBtn).toBeDefined();
    fireEvent.click(signOutBtn);
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
