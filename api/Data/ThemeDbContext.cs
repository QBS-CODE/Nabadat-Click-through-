using Microsoft.EntityFrameworkCore;
using ThemeApi.Models;

namespace ThemeApi.Data;

public class ThemeDbContext(DbContextOptions<ThemeDbContext> options) : DbContext(options)
{
    public DbSet<TenantTheme> Tenants => Set<TenantTheme>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<TenantTheme>().HasIndex(t => t.Slug).IsUnique();

        // Fixed seed date so the model stays deterministic across builds.
        var seeded = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        b.Entity<TenantTheme>().HasData(
            // Default Nabadat brand (matches index.css exactly).
            new TenantTheme
            {
                Id = 1, Slug = "nabadat", Name = "Nabadat (default)",
                Primary = "#0D8BBC", Secondary = "#13DB9B", Neutral = "#1E2235",
                Sidebar = "#1E2235", Accent = "#EEF1F7", Background = "#F7F9FC",
                UpdatedAt = seeded,
            },
            // Demo tenant — purple bank.
            new TenantTheme
            {
                Id = 2, Slug = "acme", Name = "Acme Bank",
                Primary = "#7C3AED", Secondary = "#DB2777", Neutral = "#241B33",
                UpdatedAt = seeded,
            },
            // Demo tenant — orange telecom.
            new TenantTheme
            {
                Id = 3, Slug = "globex", Name = "Globex Telecom",
                Primary = "#EA580C", Secondary = "#0891B2", Neutral = "#1C1917",
                UpdatedAt = seeded,
            },
            // Subdomain demo — gac.* → green brand.
            new TenantTheme
            {
                Id = 4, Slug = "gac", Name = "GAC (green)",
                Primary = "#0E8A3E", Secondary = "#5FB85C", Neutral = "#16241B",
                UpdatedAt = seeded,
            },
            // Subdomain demo — vodafone.* → red brand.
            new TenantTheme
            {
                Id = 5, Slug = "vodafone", Name = "Vodafone (red)",
                Primary = "#E60000", Secondary = "#A50000", Neutral = "#241A1A",
                UpdatedAt = seeded,
            }
        );
    }
}
