using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrowserHistory.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnusedHistoryAndPageTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HistoryNodes");

            migrationBuilder.DropTable(
                name: "Pages");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HistoryNodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    FaviconUrl = table.Column<string>(type: "TEXT", maxLength: 2048, nullable: true),
                    IsBookmarked = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastVisitedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", maxLength: 2048, nullable: false),
                    VisitCount = table.Column<int>(type: "INTEGER", nullable: false),
                    VisitedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HistoryNodes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Pages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: true),
                    ContentLength = table.Column<long>(type: "INTEGER", nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    FaviconUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Keywords = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Language = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    LastIndexedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    StatusCode = table.Column<int>(type: "INTEGER", nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HistoryNodes_IsBookmarked",
                table: "HistoryNodes",
                column: "IsBookmarked");

            migrationBuilder.CreateIndex(
                name: "IX_HistoryNodes_LastVisitedAt",
                table: "HistoryNodes",
                column: "LastVisitedAt");

            migrationBuilder.CreateIndex(
                name: "IX_HistoryNodes_Search",
                table: "HistoryNodes",
                columns: new[] { "Title", "Url" });

            migrationBuilder.CreateIndex(
                name: "IX_HistoryNodes_Title",
                table: "HistoryNodes",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_HistoryNodes_Url",
                table: "HistoryNodes",
                column: "Url",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pages_ContentLength",
                table: "Pages",
                column: "ContentLength");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_Language",
                table: "Pages",
                column: "Language");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_LastIndexedAt",
                table: "Pages",
                column: "LastIndexedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_Title",
                table: "Pages",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_Url",
                table: "Pages",
                column: "Url",
                unique: true);
        }
    }
}
