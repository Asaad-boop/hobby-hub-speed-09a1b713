/**
 * UI step test for the per-staff permissions modal.
 *
 * Verifies the full round-trip:
 *   1. Open the dialog → fetches current permissions
 *   2. Toggle checkboxes → local draft updates
 *   3. Click Save → calls upsert with the right payload
 *   4. After save, the inline summary badges reflect the new permissions
 *
 * Supabase is mocked at the module level so no network calls happen.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mock Supabase client BEFORE importing the component under test ---
type Row = { user_id: string; permissions: Record<string, boolean> };
const STORE: Record<string, Row> = {};

const upsertMock = vi.fn(async (row: Row) => {
  STORE[row.user_id] = {
    user_id: row.user_id,
    permissions: row.permissions ?? {},
  };
  return { error: null };
});

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: "admin-user" } } },
        }),
      },
      from: (_table: string) => ({
        select: (_cols: string) => ({
          eq: (_col: string, val: string) => ({
            maybeSingle: async () => ({
              data: STORE[val]
                ? { permissions: STORE[val].permissions }
                : null,
              error: null,
            }),
          }),
        }),
        upsert: async (row: Row) => {
          await upsertMock(row);
          return { error: null };
        },
      }),
    },
  };
});

import {
  StaffPermissionsDialog,
  PermissionsSummary,
} from "@/components/admin/StaffPermissionsDialog";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("StaffPermissionsDialog", () => {
  beforeEach(() => {
    upsertMock.mockClear();
    for (const k of Object.keys(STORE)) delete STORE[k];
  });

  it("opens, toggles a permission, saves, and updates summary badges", async () => {
    const user = userEvent.setup();
    const userId = "staff-1";

    wrap(
      <div>
        <StaffPermissionsDialog userId={userId} email="staff@example.com" />
        <div data-testid="summary-host">
          <PermissionsSummary userId={userId} />
        </div>
      </div>,
    );

    // Initially: summary shows "No extra permissions"
    await waitFor(() =>
      expect(
        within(screen.getByTestId("summary-host")).getByText(
          /no extra permissions/i,
        ),
      ).toBeInTheDocument(),
    );

    // Step 1: open dialog
    await user.click(screen.getByRole("button", { name: /permissions/i }));

    // Step 2: dialog renders with all 4 checkboxes, none checked
    const dialog = await screen.findByRole("dialog");
    const checkboxes = within(dialog).getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
    for (const cb of checkboxes) {
      expect(cb).toHaveAttribute("data-state", "unchecked");
    }

    // Step 3: toggle "Can view orders" + "Can manage products"
    await user.click(within(dialog).getByLabelText(/can view orders/i));
    await user.click(within(dialog).getByLabelText(/can manage products/i));

    // Step 4: click Save
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

    // upsert called with the expected payload
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const payload = upsertMock.mock.calls[0][0];
    expect(payload.user_id).toBe(userId);
    expect(payload.permissions).toMatchObject({
      can_view_orders: true,
      can_manage_products: true,
    });

    // Dialog closes
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    // Step 5: badges update (cache invalidated → refetch returns new perms)
    await waitFor(() => {
      const host = screen.getByTestId("summary-host");
      expect(within(host).getByText(/can view orders/i)).toBeInTheDocument();
      expect(
        within(host).getByText(/can manage products/i),
      ).toBeInTheDocument();
    });
  });
});
