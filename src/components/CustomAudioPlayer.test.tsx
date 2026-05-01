import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { CustomAudioPlayer } from "./CustomAudioPlayer";

const track = {
  id: "track-1",
  name: "A very long looping song title.mp3",
};

const PlayerHarness = () => {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <>
      <audio ref={audioRef} />
      <CustomAudioPlayer
        audioRef={audioRef}
        selectedFile={track}
        playMode="repeat-all"
        onTogglePlayMode={() => undefined}
      />
    </>
  );
};

describe("CustomAudioPlayer", () => {
  it("再生中だけ曲名をループ表示用に複製する", async () => {
    const { container } = render(<PlayerHarness />);

    expect(screen.getAllByText(track.name)).toHaveLength(1);

    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    fireEvent.play(audio as HTMLAudioElement);

    await waitFor(() => {
      expect(screen.getAllByText(track.name)).toHaveLength(2);
    });
  });
});
