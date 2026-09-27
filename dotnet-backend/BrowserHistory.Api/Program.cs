using BrowserHistory.Application;
using BrowserHistory.Infrastructure;
using BrowserHistory.Api.Extensions;
using Microsoft.AspNetCore.ResponseCompression;
using System.Text.Json;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.WriteIndented = builder.Environment.IsDevelopment();
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.AddRateLimiting();

var app = builder.Build();

// Apply pending EF Core migrations for both databases on startup (never actually invoked before -
// see InitializeDatabaseAsync's remarks). A fresh deployment with no database files would 500 on
// every request without this.
await app.Services.InitializeDatabaseAsync();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCustomMiddleware();

app.UseResponseCompression();
app.UseRateLimiter();

app.UseCors("AllowAll");
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapSyncEndpoints();
app.MapFaviconEndpoints();
app.MapSSEEndpoints();
app.MapHealthEndpoints();

app.Run();

// Make the implicit Program class public for testing
public partial class Program { }
