using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using ThemeApi.Data;
using ThemeApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ThemeDbContext>(o => o.UseSqlite("Data Source=themes.db"));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Allow the Vite dev server (and a couple of common alt ports) to call the API.
const string SpaCors = "spa";
builder.Services.AddCors(o => o.AddPolicy(SpaCors, p => p
    // Dev: allow localhost AND any *.localhost subdomain (vodafone.localhost, …),
    // on any port, so the subdomain-driven SPA can call the API.
    .SetIsOriginAllowed(origin =>
        Uri.TryCreate(origin, UriKind.Absolute, out var u)
        && (u.Host == "localhost" || u.Host.EndsWith(".localhost")))
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

// Create the SQLite file + seed on first run (no migrations needed for testing).
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<ThemeDbContext>().Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors(SpaCors);

// ── helpers ─────────────────────────────────────────────────────────────────
var hex = new Regex("^#[0-9a-fA-F]{6}$");

// Response shape == the frontend TenantThemeSeed (camelCase via web JSON defaults).
static TenantSeed ToSeed(TenantTheme t) =>
    new(t.Primary, t.Secondary, t.Neutral, t.Sidebar, t.Accent, t.Background);

// Resolve the tenant from the request HOST (subdomain), the production pattern:
//   gac.nabadat.com → "gac";  vodafone.nabadat.com → "vodafone";
//   nabadat.com / localhost / an IP → null (caller falls back to the default).
static string? TenantFromHost(HttpRequest req)
{
    var host = req.Host.Host;
    if (System.Net.IPAddress.TryParse(host, out _)) return null;
    var labels = host.Split('.');
    if (labels.Length < 2) return null; // bare "localhost" → no subdomain
    var first = labels[0].ToLowerInvariant();
    return first is "www" or "app" or "nabadat" ? null : first;
}

static string[] BadColors(Regex hex, TenantTheme t)
{
    var errors = new List<string>();
    void Check(string? v, string name, bool required)
    {
        if (string.IsNullOrWhiteSpace(v)) { if (required) errors.Add($"{name} is required"); return; }
        if (!hex.IsMatch(v)) errors.Add($"{name} must be a #RRGGBB hex color (got '{v}')");
    }
    Check(t.Primary, "primary", true);
    Check(t.Secondary, "secondary", true);
    Check(t.Neutral, "neutral", true);
    Check(t.Sidebar, "sidebar", false);
    Check(t.Accent, "accent", false);
    Check(t.Background, "background", false);
    return errors.ToArray();
}

// ── endpoints ────────────────────────────────────────────────────────────────

// List all tenants (summary).
app.MapGet("/api/tenants", async (ThemeDbContext db) =>
    await db.Tenants.OrderBy(t => t.Id)
        .Select(t => new TenantSummary(t.Slug, t.Name, t.Primary, t.Secondary, t.Neutral, t.UpdatedAt))
        .ToListAsync())
    .WithName("ListTenants");

// ⭐ The production endpoint: the FRONTEND calls this with no slug — the backend
// derives the tenant from the request's subdomain (Host header) and returns its
// colors. Unknown/no subdomain → the default Nabadat brand.
app.MapGet("/api/theme/current", async (HttpRequest req, ThemeDbContext db) =>
{
    var slug = TenantFromHost(req) ?? "nabadat";
    var tenant = await db.Tenants.FirstOrDefaultAsync(x => x.Slug == slug)
                 ?? await db.Tenants.FirstOrDefaultAsync(x => x.Slug == "nabadat");
    return tenant is null
        ? Results.NotFound()
        : Results.Ok(new CurrentTheme(tenant.Slug, tenant.Primary, tenant.Secondary,
            tenant.Neutral, tenant.Sidebar, tenant.Accent, tenant.Background));
})
    .WithName("GetCurrentTheme");

// The one the frontend calls: GET the 6-color seed for a tenant.
app.MapGet("/api/tenants/{slug}/theme", async (string slug, ThemeDbContext db) =>
{
    var t = await db.Tenants.FirstOrDefaultAsync(x => x.Slug == slug);
    return t is null
        ? Results.NotFound(new { error = $"No tenant '{slug}'" })
        : Results.Ok(ToSeed(t));
})
    .WithName("GetTenantTheme");

// Create a tenant theme.
app.MapPost("/api/tenants", async (TenantTheme input, ThemeDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(input.Slug) || !Regex.IsMatch(input.Slug, "^[a-z0-9-]+$"))
        return Results.BadRequest(new { error = "slug must be lowercase letters/digits/hyphens" });
    var errors = BadColors(hex, input);
    if (errors.Length > 0) return Results.BadRequest(new { errors });
    if (await db.Tenants.AnyAsync(x => x.Slug == input.Slug))
        return Results.Conflict(new { error = $"tenant '{input.Slug}' already exists" });

    input.Id = 0;
    input.UpdatedAt = DateTime.UtcNow;
    db.Tenants.Add(input);
    await db.SaveChangesAsync();
    return Results.Created($"/api/tenants/{input.Slug}/theme", ToSeed(input));
})
    .WithName("CreateTenant");

// Update a tenant's colors.
app.MapPut("/api/tenants/{slug}/theme", async (string slug, TenantTheme input, ThemeDbContext db) =>
{
    var t = await db.Tenants.FirstOrDefaultAsync(x => x.Slug == slug);
    if (t is null) return Results.NotFound(new { error = $"No tenant '{slug}'" });
    var errors = BadColors(hex, input);
    if (errors.Length > 0) return Results.BadRequest(new { errors });

    t.Primary = input.Primary;
    t.Secondary = input.Secondary;
    t.Neutral = input.Neutral;
    t.Sidebar = input.Sidebar;
    t.Accent = input.Accent;
    t.Background = input.Background;
    t.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(ToSeed(t));
})
    .WithName("UpdateTenantTheme");

// Delete a tenant.
app.MapDelete("/api/tenants/{slug}", async (string slug, ThemeDbContext db) =>
{
    var t = await db.Tenants.FirstOrDefaultAsync(x => x.Slug == slug);
    if (t is null) return Results.NotFound();
    db.Tenants.Remove(t);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("DeleteTenant");

app.Run();
