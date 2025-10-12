import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import IataInput from "../IataInput";

const mockAirports = [
  {
    iata: "SIN",
    name: "Changi",
    city: "Singapore",
    country: "SG",
    timezone: "Asia/Singapore",
  },
  {
    iata: "SFO",
    name: "San Francisco Intl",
    city: "San Francisco",
    country: "US",
    timezone: "America/Los_Angeles",
  },
];

describe("IataInput", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockAirports) })
      )
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows suggestions and allows click selection", async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <IataInput
        value=""
        onChange={onChange}
        onSelect={onSelect}
        placeholder="IATA"
      />
    );
    const input = screen.getByPlaceholderText("IATA") as HTMLInputElement;
    await userEvent.type(input, "s");
    // wait for debounce + fetch
    await waitFor(() => expect(screen.getByText(/Changi/)).toBeInTheDocument());
    const item = screen.getByText(/Changi/);
    fireEvent.mouseDown(item);
    expect(onChange).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalled();
  });

  it("supports keyboard navigation and enter to select", async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <IataInput
        value=""
        onChange={onChange}
        onSelect={onSelect}
        placeholder="IATA"
      />
    );
    const input = screen.getByPlaceholderText("IATA") as HTMLInputElement;
    await userEvent.type(input, "s");
    await waitFor(() => expect(screen.getByText(/Changi/)).toBeInTheDocument());
    // press ArrowDown to highlight first item and Enter
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalled();
  });

  it("shows validation hint when forced invalid after interaction", async () => {
    const onChange = vi.fn();
    render(
      <IataInput value="" onChange={onChange} placeholder="IATA" forceInvalid />
    );
    const input = screen.getByPlaceholderText("IATA") as HTMLInputElement;
    // error should not be visible immediately
    expect(screen.queryByText(/IATA code required/)).not.toBeInTheDocument();
    // interact
    await userEvent.click(input);
    await userEvent.type(input, "S");
    // validation hint should appear
    await waitFor(() =>
      expect(screen.getByText(/IATA code required/)).toBeInTheDocument()
    );
  });

  it("shows validation hint when focused and empty", async () => {
    const onChange = vi.fn();
    render(<IataInput value="" onChange={onChange} placeholder="IATA" />);
    const input = screen.getByPlaceholderText("IATA") as HTMLInputElement;
    // focus the empty input
    await userEvent.click(input);
    // hint should appear because focus + empty triggers validation
    await waitFor(() => expect(screen.getByText(/IATA code required/)).toBeInTheDocument());
  });
});
