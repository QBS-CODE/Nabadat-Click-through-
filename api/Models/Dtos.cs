namespace ThemeApi.Models;

/// <summary>Summary row returned by GET /api/tenants.</summary>
public record TenantSummary(
    string Slug,
    string Name,
    string Primary,
    string Secondary,
    string Neutral,
    DateTime UpdatedAt);

/// <summary>The 6-color brand seed — matches the frontend `TenantThemeSeed`.</summary>
public record TenantSeed(
    string Primary,
    string Secondary,
    string Neutral,
    string? Sidebar,
    string? Accent,
    string? Background);

/// <summary>Seed + the resolved slug, returned by GET /api/theme/current so the
/// client can tell whether it's the default tenant (→ use index.css verbatim).</summary>
public record CurrentTheme(
    string Slug,
    string Primary,
    string Secondary,
    string Neutral,
    string? Sidebar,
    string? Accent,
    string? Background);
