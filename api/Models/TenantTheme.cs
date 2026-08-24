using System.ComponentModel.DataAnnotations;

namespace ThemeApi.Models;

/// <summary>
/// A tenant's brand seed — mirrors the frontend `TenantThemeSeed`
/// (src/lib/theme/tenant-theme.ts). 3 required + 3 optional colors; the
/// frontend's deriveThemeVars() expands these into the full CSS variable set.
/// D1–D5 / destructive are global and never stored here.
/// </summary>
public class TenantTheme
{
    public int Id { get; set; }

    /// <summary>URL-safe identifier used in routes, e.g. "acme".</summary>
    [Required, RegularExpression("^[a-z0-9-]+$")]
    public string Slug { get; set; } = "";

    [Required]
    public string Name { get; set; } = "";

    // ── 3 required seeds ──
    [Required] public string Primary { get; set; } = "";
    [Required] public string Secondary { get; set; } = "";
    [Required] public string Neutral { get; set; } = "";

    // ── 3 optional refinements (null → frontend derives a default) ──
    public string? Sidebar { get; set; }
    public string? Accent { get; set; }
    public string? Background { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
