import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { PostComposeModal } from "./PostComposeModal";

const mockPush = jest.fn();
const mockOnClose = jest.fn();
const mockSignTransaction = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: (...args: unknown[]) => mockSignTransaction(...args),
}));

const mockGetAccount = jest.fn();
const mockSimulateTransaction = jest.fn();
const mockSendTransaction = jest.fn();
const mockGetTransaction = jest.fn();

jest.mock("@stellar/stellar-sdk", () => {
  const mockBuild = jest.fn().mockReturnValue({ toXDR: () => "mock-xdr" });
  const mockAssembleTx = jest.fn().mockReturnValue({ build: mockBuild });
  return {
    BASE_FEE: "100",
    TransactionBuilder: Object.assign(
      jest.fn().mockImplementation(() => ({
        addOperation: jest.fn().mockReturnThis(),
        setTimeout: jest.fn().mockReturnThis(),
        build: mockBuild,
      })),
      {
        fromXDR: jest.fn().mockReturnValue({ toXDR: () => "mock-signed-xdr" }),
      }
    ),
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue("mock-op"),
    })),
    Address: {
      fromString: jest.fn().mockReturnValue({ toScVal: () => "mock-scval" }),
    },
    nativeToScVal: jest.fn().mockReturnValue("mock-scval"),
    scValToNative: jest.fn().mockReturnValue(BigInt(42)),
    rpc: {
      Server: jest.fn().mockImplementation(() => ({
        getAccount: mockGetAccount,
        simulateTransaction: mockSimulateTransaction,
        sendTransaction: mockSendTransaction,
        getTransaction: mockGetTransaction,
      })),
      assembleTransaction: mockAssembleTx,
      Api: {
        isSimulationError: jest.fn().mockReturnValue(false),
      },
    },
  };
});

const MOCK_PUBLIC_KEY = "GBRPYHIL2CI3WHZDTOOQFC6EB4RBIGSJRVSBUOYS77TQ7CQK5FHQ6SR";

function renderModal(isOpen = true) {
  return render(
    <PostComposeModal isOpen={isOpen} onClose={mockOnClose} publicKey={MOCK_PUBLIC_KEY} />
  );
}

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  mockGetAccount.mockResolvedValue({ sequence: "1" });
  mockSimulateTransaction.mockResolvedValue({});
  mockSendTransaction.mockResolvedValue({
    status: "PENDING",
    hash: "tx-hash-123",
  });
  mockGetTransaction.mockResolvedValue({
    status: "SUCCESS",
    returnValue: BigInt(42),
  });
  mockSignTransaction.mockResolvedValue("signed-xdr-string");
});

afterEach(() => {
  jest.useRealTimers();
});

describe("PostComposeModal", () => {
  // 1. Modal doesn't render when closed
  it("does not render when isOpen is false", () => {
    renderModal(false);
    expect(screen.queryByText("Compose Post")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("What's happening on-chain?")).not.toBeInTheDocument();
  });

  // 2. Modal renders when open
  it("renders textarea, counter, and submit button when open", () => {
    renderModal(true);
    expect(screen.getByText("Compose Post")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What's happening on-chain?")).toBeInTheDocument();
    expect(screen.getByText("280")).toBeInTheDocument();
    expect(screen.getByText("Publish Post")).toBeInTheDocument();
  });

  // 3. Character counter shows remaining chars and turns amber/red at thresholds
  it("updates remaining character counter as user types", () => {
    renderModal(true);
    const textarea = screen.getByPlaceholderText("What's happening on-chain?");

    // "Hello world" = 11 chars → 280 - 11 = 269 remaining
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    expect(screen.getByText("269")).toBeInTheDocument();

    // "Hello linkora community" = 23 chars → 280 - 23 = 257 remaining
    fireEvent.change(textarea, { target: { value: "Hello linkora community" } });
    expect(screen.getByText("257")).toBeInTheDocument();

    // 230 chars → 50 remaining (amber threshold)
    const amberContent = "a".repeat(230);
    fireEvent.change(textarea, { target: { value: amberContent } });
    const counterAmber = screen.getByLabelText("50 characters remaining");
    expect(counterAmber).toHaveClass("text-yellow-500");

    // 270 chars → 10 remaining (red threshold)
    const redContent = "a".repeat(270);
    fireEvent.change(textarea, { target: { value: redContent } });
    const counterRed = screen.getByLabelText("10 characters remaining");
    expect(counterRed).toHaveClass("text-red-500");
  });

  // 4. Submit disabled when empty
  it("disables submit button when content is empty", () => {
    renderModal(true);
    const submitBtn = screen.getByText("Publish Post");
    expect(submitBtn).toBeDisabled();
  });

  // 5. Shows preview when content exists
  it("shows live preview when content is entered", () => {
    renderModal(true);
    const textarea = screen.getByPlaceholderText("What's happening on-chain?");

    expect(screen.queryByText("Preview")).not.toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "My on-chain post" } });
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getAllByText("My on-chain post").length).toBeGreaterThanOrEqual(2);
  });

  // 6. signTransaction invoked on submit
  it("calls signTransaction and transitions through signing states", async () => {
    renderModal(true);
    const textarea = screen.getByPlaceholderText("What's happening on-chain?");

    fireEvent.change(textarea, { target: { value: "Test post" } });
    fireEvent.click(screen.getByText("Publish Post"));

    expect(screen.getByText("Waiting for Freighter wallet signing...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSignTransaction).toHaveBeenCalledWith(
        "mock-xdr",
        expect.objectContaining({ networkPassphrase: expect.any(String) })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Submitting transaction to Stellar blockchain...")
      ).toBeInTheDocument();
    });
  });

  // 7. Success and error states
  it("displays success state and redirects after successful publish", async () => {
    jest.useFakeTimers();

    mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: "tx-hash-123" });
    mockGetTransaction.mockResolvedValue({ status: "SUCCESS", returnValue: BigInt(42) });

    renderModal(true);
    const textarea = screen.getByPlaceholderText("What's happening on-chain?");

    fireEvent.change(textarea, { target: { value: "New post" } });
    fireEvent.click(screen.getByText("Publish Post"));

    await waitFor(() => {
      expect(mockSignTransaction).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(screen.getByText("Post published successfully! Redirecting...")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /view on stellar expert/i })).toHaveAttribute(
        "href",
        "https://stellar.expert/explorer/testnet/tx/tx-hash-123"
      );
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/posts/42");
    });

    jest.useRealTimers();
  });

  it("displays error state when submission fails", async () => {
    mockSendTransaction.mockRejectedValue(new Error("Network timeout"));

    renderModal(true);
    const textarea = screen.getByPlaceholderText("What's happening on-chain?");

    fireEvent.change(textarea, { target: { value: "Fail post" } });
    fireEvent.click(screen.getByText("Publish Post"));

    await waitFor(() => {
      expect(screen.getByText("Network timeout")).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });
});
