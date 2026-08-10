import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusHero } from "./StatusHero.js";

describe("StatusHero", () => {
  it("uses accurate indexing copy and exposes progress accessibly", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.0.0", coreHeight: 101, indexedHeight: 100, percent: 99.01, message: "Indexing Litecoin blocks" }} />);

    expect(screen.getByRole("status")).toHaveAccessibleName("ElectrumX is indexing");
    expect(screen.getByText("Indexing Litecoin blocks")).toBeInTheDocument();
    expect(screen.queryByText("Synchronized")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99.01");
    expect(container.querySelectorAll(".is-indexed")).toHaveLength(5);
    expect(container.querySelector(".index-art")).toHaveClass("is-syncing");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-complete");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
  });

  it("marks all six blocks solid and complete only when ready", () => {
    const { container } = render(<StatusHero status={{ state: "ready", version: "2.0.0", coreHeight: 101, indexedHeight: 101, percent: 100, message: "ElectrumX is synchronized" }} />);
    expect(container.querySelector(".index-art")).toHaveClass("is-complete");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block.is-indexed")).toHaveLength(6);
  });

  it("does not apply synchronization animation states while waiting, connecting, or degraded", () => {
    for (const state of ["waiting-for-core", "connecting", "degraded"] as const) {
      const { container, unmount } = render(<StatusHero status={{ state, version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Waiting" }} />);
      expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing", "is-complete");
      expect(container.querySelectorAll(".index-block")).toHaveLength(6);
      unmount();
    }
  });
});
