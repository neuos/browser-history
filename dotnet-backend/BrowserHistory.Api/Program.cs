using BrowserHistory.Application;
using BrowserHistory.Infrastructure;
using BrowserHistory.Api.Extensions;
using Microsoft.AspNetCore.ResponseCompression;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add Serilog
builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add Application and Infrastructure layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Add performance optimizations
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("ShortTerm", policy => policy.Expire(TimeSpan.FromMinutes(1)));
    options.AddPolicy("MediumTerm", policy => policy.Expire(TimeSpan.FromMinutes(10)));
    options.AddPolicy("LongTerm", policy => policy.Expire(TimeSpan.FromHours(1)));
});

// Add rate limiting
builder.Services.AddRateLimiting();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Add custom middleware pipeline (correlation ID, exception handling, enhanced logging)
app.UseCustomMiddleware();

// Add performance middleware
app.UseResponseCompression();
app.UseOutputCache();
app.UseRateLimiter();

app.UseCors("AllowAll");
app.UseHttpsRedirection();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Map API endpoints
app.MapAuthEndpoints();
app.MapDeviceEndpoints();
app.MapSyncEndpoints();
app.MapHistoryEndpoints();
app.MapSSEEndpoints();
app.MapHealthEndpoints();

app.Run();

// Make the implicit Program class public for testing
public partial class Program { }
