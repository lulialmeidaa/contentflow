import { ImageResponse } from "next/og";

/** Ícone do app: fundo preto, "c" branco e ponto rosé. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#151313",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderRadius: "50%",
              border: `${size * 0.075}px solid #ffffff`,
              borderRightColor: "transparent",
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              width: size * 0.11,
              height: size * 0.11,
              borderRadius: "50%",
              background: "#d9a3a8",
              marginLeft: size * 0.02,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
