export default function manifest() {
  return {
    name: "Chimbo La Vijana Brunch",
    short_name: "Chimbo",
    description: "Event registration, QR tickets, check-in, food confirmation, booth scanning, and admin operations.",
    start_url: "/register",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4fbf9",
    theme_color: "#247b7b",
    categories: ["events", "productivity"],
    lang: "sw-TZ",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };
}
