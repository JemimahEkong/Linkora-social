import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

// Mock expo-router (used by other components but imported here for safety in case
// of upstream expansion).
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: jest.fn(),
}));

// Minimal theme mock — the ProfileHeader only needs the bits it actually
// touches. If new styles are added, extend this fixture.
jest.mock("../../theme/useTheme", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        surface: {
          background: "#0f172a",
          surface1: "#111827",
          border: "#334155",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
          onBrand: "#ffffff",
        },
        semantic: { error: "#ef4444" },
        brand: { primary: "#6366f1" },
      },
      radius: { full: 999 },
    },
  }),
}));

import ProfileHeader, { ProfileData } from "../ProfileHeader";

const baseProfile: ProfileData = {
  address: "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  username: "alice",
  bio: null,
};

const baseProps = {
  isFollowing: false,
  isOwnProfile: false,
  onFollowersPress: jest.fn(),
  onFollowingPress: jest.fn(),
  onEditPress: jest.fn(),
  onToggleFollow: jest.fn(),
};

describe("ProfileHeader (#736 Mobile Profile tab follower/following counts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the em-dash placeholder while follower and following counts are loading (null)", () => {
    const { getByTestId, getByText } = render(
      <ProfileHeader
        profile={baseProfile}
        followerCount={null}
        followingCount={null}
        {...baseProps}
      />,
    );

    const followerText = getByTestId("follower-count");
    const followingText = getByTestId("following-count");

    // The em-dash glyph renders as the placeholder.
    expect(followerText.props.children).toBe("\u2014");
    expect(followingText.props.children).toBe("\u2014");

    // Labels remain visible.
    expect(getByText("Followers")).toBeTruthy();
    expect(getByText("Following")).toBeTruthy();
  });

  it("renders numeric counts when follower and following counts are provided", () => {
    const { getByTestId } = render(
      <ProfileHeader
        profile={baseProfile}
        followerCount={42}
        followingCount={7}
        {...baseProps}
      />,
    );

    const followerText = getByTestId("follower-count");
    const followingText = getByTestId("following-count");

    expect(followerText.props.children).toBe(42);
    expect(followingText.props.children).toBe(7);
  });

  it("handles a mixed state: one count loaded, one still loading", () => {
    const { getByTestId } = render(
      <ProfileHeader
        profile={baseProfile}
        followerCount={99}
        followingCount={null}
        {...baseProps}
      />,
    );

    expect(getByTestId("follower-count").props.children).toBe(99);
    expect(getByTestId("following-count").props.children).toBe("\u2014");
  });

  it("exposes a screen-reader-friendly accessibility label that reflects loading", () => {
    const { getByTestId, rerender } = render(
      <ProfileHeader
        profile={baseProfile}
        followerCount={null}
        followingCount={null}
        {...baseProps}
      />,
    );

    expect(getByTestId("follower-count").props.accessibilityLabel).toBe(
      "Followers loading",
    );
    expect(getByTestId("following-count").props.accessibilityLabel).toBe(
      "Following loading",
    );

    rerender(
      <ProfileHeader
        profile={baseProfile}
        followerCount={3}
        followingCount={5}
        {...baseProps}
      />,
    );

    expect(getByTestId("follower-count").props.accessibilityLabel).toBe(
      "3 followers",
    );
    expect(getByTestId("following-count").props.accessibilityLabel).toBe(
      "5 following",
    );
  });

  it("invokes the followers and following callbacks when counts are tapped", () => {
    const onFollowersPress = jest.fn();
    const onFollowingPress = jest.fn();

    const { getByTestId } = render(
      <ProfileHeader
        profile={baseProfile}
        followerCount={12}
        followingCount={34}
        {...baseProps}
        onFollowersPress={onFollowersPress}
        onFollowingPress={onFollowingPress}
      />,
    );

    // The count Pressable wraps the count Text + the "Followers"/"Following"
    // label. Walking up to the Pressable parent lets us trigger the same
    // touch event the user would.
    fireEvent.press(getByTestId("follower-count").parent!);
    fireEvent.press(getByTestId("following-count").parent!);

    expect(onFollowersPress).toHaveBeenCalledTimes(1);
    expect(onFollowingPress).toHaveBeenCalledTimes(1);
  });

  it("shows the Edit button when viewing the user's own profile", () => {
    const onEditPress = jest.fn();
    const { getByText } = render(
      <ProfileHeader
        profile={baseProfile}
        followerCount={1}
        followingCount={1}
        {...baseProps}
        isOwnProfile
        onEditPress={onEditPress}
      />,
    );

    fireEvent.press(getByText("Edit"));
    expect(onEditPress).toHaveBeenCalledTimes(1);
  });

  it("shows the Follow / Following toggle when viewing someone else's profile", () => {
    const onToggleFollow = jest.fn();
    const { getByText } = render(
      <ProfileHeader
        profile={baseProfile}
        followerCount={1}
        followingCount={1}
        {...baseProps}
        isFollowing={false}
        onToggleFollow={onToggleFollow}
      />,
    );

    fireEvent.press(getByText("Follow"));
    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });
});
