/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceTabs } from './WorkspaceTabs';
import type { Workspace } from '@shared/types/config';

const createMockWorkspaces = (count: number): Workspace[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `workspace-${i}`,
    name: `Workspace ${i + 1}`,
    buttons: [],
    encoders: [],
  }));
};

describe('WorkspaceTabs', () => {
  it('renders all workspace tabs', () => {
    const workspaces = createMockWorkspaces(3);
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    expect(screen.getByTestId('workspace-tab-0')).toBeTruthy();
    expect(screen.getByTestId('workspace-tab-1')).toBeTruthy();
    expect(screen.getByTestId('workspace-tab-2')).toBeTruthy();
  });

  it('displays workspace names', () => {
    const workspaces = createMockWorkspaces(2);
    workspaces[0].name = 'Main';
    workspaces[1].name = 'Gaming';
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    expect(screen.getByText('Main')).toBeTruthy();
    expect(screen.getByText('Gaming')).toBeTruthy();
  });

  it('highlights the active workspace tab', () => {
    const workspaces = createMockWorkspaces(3);
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={1}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    const tab0 = screen.getByTestId('workspace-tab-0');
    const tab1 = screen.getByTestId('workspace-tab-1');
    const tab2 = screen.getByTestId('workspace-tab-2');

    expect(tab0.classList.contains('workspace-tabs__tab--active')).toBe(false);
    expect(tab1.classList.contains('workspace-tabs__tab--active')).toBe(true);
    expect(tab2.classList.contains('workspace-tabs__tab--active')).toBe(false);
  });

  it('calls onSelect with correct index when tab is clicked', () => {
    const workspaces = createMockWorkspaces(3);
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    fireEvent.click(screen.getByTestId('workspace-tab-2'));

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders the add button', () => {
    const workspaces = createMockWorkspaces(1);
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    expect(screen.getByTestId('workspace-tabs-add')).toBeTruthy();
    expect(screen.getByTestId('workspace-tabs-add').textContent).toBe('+');
  });

  it('calls onCreate when add button is clicked', () => {
    const workspaces = createMockWorkspaces(1);
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    fireEvent.click(screen.getByTestId('workspace-tabs-add'));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('handles empty workspaces array', () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={[]}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    // Only the add button should be present
    expect(screen.getByTestId('workspace-tabs-add')).toBeTruthy();
    expect(screen.queryByTestId('workspace-tab-0')).toBeFalsy();
  });

  it('sets title attribute on tabs for tooltip', () => {
    const workspaces = createMockWorkspaces(1);
    workspaces[0].name = 'My Workspace';
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    expect(screen.getByTestId('workspace-tab-0').getAttribute('title')).toBe('My Workspace');
  });

  it('updates active state when activeIndex changes', () => {
    const workspaces = createMockWorkspaces(3);
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    const { rerender } = render(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={0}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    expect(screen.getByTestId('workspace-tab-0').classList.contains('workspace-tabs__tab--active')).toBe(true);

    rerender(
      <WorkspaceTabs
        workspaces={workspaces}
        activeIndex={2}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );

    expect(screen.getByTestId('workspace-tab-0').classList.contains('workspace-tabs__tab--active')).toBe(false);
    expect(screen.getByTestId('workspace-tab-2').classList.contains('workspace-tabs__tab--active')).toBe(true);
  });
});
