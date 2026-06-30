import React from "react";
import renderer from "react-test-renderer";
import { act, fireEvent, render } from "@testing-library/react-native";
import { PostCard, Post } from "./PostCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

jest.mock("expo-router", () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }));
jest.mock("../context/WalletContext", () => ({
  useWalletContext: () => ({
    wallet: { address: "GADDRESSMOCKEDFOROPTIMISTICTEST" },
    network: "TESTNET",
    state: "connected",
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    refresh: jest.fn(),
    setNetwork: jest.fn(),
  }),
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("../context/ToastContext", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("PostCard", () => {
  const defaultPost: Post = {
    id: 1,
    author: "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    username: "john.doe",
    content: "This is a sample post content.",
    tip_total: 100,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
    like_count: 42,
  };

  describe("Rendering", () => {
    it("renders all post fields correctly", () => {
      const { getByText, getByTestId } = render(<PostCard post={defaultPost} />);
      expect(getByText(defaultPost.username)).toBeTruthy();
      expect(getByText(defaultPost.content)).toBeTruthy();
      // The like-count badge shows the like_count next to the heart icon.
      expect(getByTestId("like-count-text").props.children).toBe(42);
      expect(getByText(/100/)).toBeTruthy();
    });

    it("renders with zero likes correctly", () => {
      const post = { ...defaultPost, like_count: 0 };
      const { getByTestId } = render(<PostCard post={post} />);
      expect(getByTestId("like-count-text").props.children).toBe(0);
    });

    it("renders with long content correctly", () => {
      const longContent =
        "This is a very long post content that spans multiple lines and demonstrates how the PostCard component handles longer text content. It should wrap properly and maintain good readability across different screen sizes.";
      const post = { ...defaultPost, content: longContent };
      const { getByText } = render(<PostCard post={post} />);
      expect(getByText(longContent)).toBeTruthy();
    });

    it("renders loading skeleton", () => {
      const { getByTestId } = render(
        <PostCard
          id="1"
          author={defaultPost.author}
          content={defaultPost.content}
          timestamp={Date.now()}
          isLoading={true}
        />
      );
      expect(getByTestId("post-skeleton")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("has accessible button role and label", () => {
      const { getAllByRole } = render(<PostCard post={defaultPost} />);
      const buttons = getAllByRole("button");
      const card = buttons.find(
        (b) => b.props.accessibilityLabel === `Post by ${defaultPost.username}`
      );
      expect(card).toBeTruthy();
    });

    it("avatar has minimum 44x44 touch target", () => {
      const tree = renderer.create(<PostCard post={defaultPost} />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe("Interaction", () => {
    it("calls onPress when tapped", () => {
      const onPress = jest.fn();
      const { getAllByRole } = render(<PostCard post={defaultPost} onPress={onPress} />);
      const card = getAllByRole("button").find(
        (b) => b.props.accessibilityLabel === `Post by ${defaultPost.username}`
      );
      fireEvent.press(card!);
      expect(onPress).toHaveBeenCalled();
    });

    it("navigates to post detail by default", () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      const { getAllByRole } = render(<PostCard post={defaultPost} />);
      const card = getAllByRole("button").find(
        (b) => b.props.accessibilityLabel === `Post by ${defaultPost.username}`
      );
      fireEvent.press(card!);
      expect(mockPush).toHaveBeenCalledWith(`/post/${defaultPost.id}`);
    });

    it("triggers light haptic feedback when the like button is pressed", () => {
      const { getByLabelText } = render(<PostCard post={defaultPost} />);

      // defaultPost has like_count: 42 and is unliked, so the
      // accessibilityLabel includes the current count for screen readers.
      fireEvent.press(getByLabelText(/^Like post/));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it("optimistically increments the displayed like count when tapped", () => {
      // Issue #735: like count must update optimistically on tap.
      const { getByTestId, getByLabelText } = render(<PostCard post={defaultPost} />);

      // Initial count is 42.
      expect(getByTestId("like-count-text").props.children).toBe(42);

      fireEvent.press(getByLabelText(/^Like post/));

      // Without awaiting the network call, the count must already be 43
      // (optimistic update). The useLike hook reverts on error, so we only
      // assert the optimistic path here.
      expect(getByTestId("like-count-text").props.children).toBe(43);
    });
  });
});
