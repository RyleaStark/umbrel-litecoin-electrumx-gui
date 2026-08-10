import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConnectionQr } from "./QrCodeDialog.js";

describe("ConnectionQr", () => {
  it("removes the decorative badge from dense Tor payloads", () => {
    const { container, rerender } = render(<ConnectionQr value="10.21.25.220:51003:t" />);
    expect(container.querySelector(".qr-brand")).not.toHaveClass("qr-brand-hidden");

    rerender(<ConnectionQr value={`${"a".repeat(62)}.onion:51003:t`} />);
    expect(container.querySelector(".qr-brand")).toHaveClass("qr-brand-hidden");
  });
});
