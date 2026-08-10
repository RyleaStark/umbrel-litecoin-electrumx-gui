import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConnectionPanel } from "./ConnectionPanel.js";

const details = {
  local: { address: "umbrel.local", port: 51003, connectionString: "umbrel.local:51003:t", transport: "tcp" as const },
  tor: { address: "electrumx.example.onion", port: 51003, connectionString: "electrumx.example.onion:51003:t", transport: "tcp" as const }
};

describe("ConnectionPanel", () => {
  it("switches between distinct Local and Tor endpoints", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Tor" }));
    expect(screen.getByText("electrumx.example.onion")).toBeInTheDocument();
  });

  it("shows a QR code for the active wallet connection", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    const image = await screen.findByRole("img", { name: "QR code for umbrel.local:51003:t" });
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });

  it("copies the complete wallet connection string", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy connection string" }));
    expect(writeText).toHaveBeenCalledWith("umbrel.local:51003:t");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("reports a clipboard failure without exposing an internal error", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("private clipboard detail")) } });
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy address" }));
    expect(screen.getByText("Copy failed")).toBeInTheDocument();
    expect(screen.queryByText(/private clipboard detail/i)).not.toBeInTheDocument();
  });
});
