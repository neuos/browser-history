using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrowserHistory.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSyncEventEntityIdAndSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SyncEvents_Devices_DeviceId",
                table: "SyncEvents");

            migrationBuilder.AddColumn<string>(
                name: "Checksum",
                table: "SyncEvents",
                type: "TEXT",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Data",
                table: "SyncEvents",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EntityId",
                table: "SyncEvents",
                type: "TEXT",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "EntityType",
                table: "SyncEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Pages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Content = table.Column<string>(type: "TEXT", nullable: true),
                    FaviconUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Language = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Keywords = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    LastIndexedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ContentLength = table.Column<long>(type: "INTEGER", nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    StatusCode = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SyncEvents_Checksum",
                table: "SyncEvents",
                column: "Checksum");

            migrationBuilder.CreateIndex(
                name: "IX_SyncEvents_EntityId",
                table: "SyncEvents",
                column: "EntityId");

            migrationBuilder.CreateIndex(
                name: "IX_SyncEvents_EntityType",
                table: "SyncEvents",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_SyncEvents_EntityType_EntityId",
                table: "SyncEvents",
                columns: new[] { "EntityType", "EntityId" });

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Pages");

            migrationBuilder.DropIndex(
                name: "IX_SyncEvents_Checksum",
                table: "SyncEvents");

            migrationBuilder.DropIndex(
                name: "IX_SyncEvents_EntityId",
                table: "SyncEvents");

            migrationBuilder.DropIndex(
                name: "IX_SyncEvents_EntityType",
                table: "SyncEvents");

            migrationBuilder.DropIndex(
                name: "IX_SyncEvents_EntityType_EntityId",
                table: "SyncEvents");

            migrationBuilder.DropColumn(
                name: "Checksum",
                table: "SyncEvents");

            migrationBuilder.DropColumn(
                name: "Data",
                table: "SyncEvents");

            migrationBuilder.DropColumn(
                name: "EntityId",
                table: "SyncEvents");

            migrationBuilder.DropColumn(
                name: "EntityType",
                table: "SyncEvents");

            migrationBuilder.AddForeignKey(
                name: "FK_SyncEvents_Devices_DeviceId",
                table: "SyncEvents",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
