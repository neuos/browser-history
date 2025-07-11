using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrowserHistory.Infrastructure.Migrations.DeviceIdentity
{
    /// <inheritdoc />
    public partial class CreateIdentityTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeviceUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DeviceId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DeviceName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    RegisteredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastSeen = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    SharedSecretHash = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    UserName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "INTEGER", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: true),
                    SecurityStamp = table.Column<string>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "INTEGER", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeviceRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RoleId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT", nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceRoleClaims_DeviceRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "DeviceRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeviceUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT", nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceUserClaims_DeviceUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "DeviceUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeviceUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "TEXT", nullable: false),
                    ProviderKey = table.Column<string>(type: "TEXT", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "TEXT", nullable: true),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_DeviceUserLogins_DeviceUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "DeviceUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeviceUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RoleId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_DeviceUserRoles_DeviceRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "DeviceRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeviceUserRoles_DeviceUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "DeviceUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeviceUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LoginProvider = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_DeviceUserTokens_DeviceUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "DeviceUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceRoleClaims_RoleId",
                table: "DeviceRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "DeviceRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeviceUserClaims_UserId",
                table: "DeviceUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceUserLogins_UserId",
                table: "DeviceUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceUserRoles_RoleId",
                table: "DeviceUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "DeviceUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceUsers_DeviceId",
                table: "DeviceUsers",
                column: "DeviceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeviceUsers_IsActive",
                table: "DeviceUsers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceUsers_LastSeen",
                table: "DeviceUsers",
                column: "LastSeen");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "DeviceUsers",
                column: "NormalizedUserName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceRoleClaims");

            migrationBuilder.DropTable(
                name: "DeviceUserClaims");

            migrationBuilder.DropTable(
                name: "DeviceUserLogins");

            migrationBuilder.DropTable(
                name: "DeviceUserRoles");

            migrationBuilder.DropTable(
                name: "DeviceUserTokens");

            migrationBuilder.DropTable(
                name: "DeviceRoles");

            migrationBuilder.DropTable(
                name: "DeviceUsers");
        }
    }
}
