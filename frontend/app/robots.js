const baseUrl = "https://www.chimbolavijana.co.tz";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/register", "/login"],
        disallow: ["/admin", "/exhibitor", "/profile", "/api"]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  };
}
