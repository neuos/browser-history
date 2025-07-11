using FluentValidation;

namespace BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;

/// <summary>
/// Validator for RegisterDeviceCommand.
/// </summary>
public sealed class RegisterDeviceCommandValidator : AbstractValidator<RegisterDeviceCommand>
{
    public RegisterDeviceCommandValidator()
    {
        RuleFor(x => x.DeviceName)
            .NotEmpty()
            .WithMessage("Device name is required")
            .MaximumLength(100)
            .WithMessage("Device name cannot exceed 100 characters")
            .Matches("^[a-zA-Z0-9\\s\\-_\\.]+$")
            .WithMessage("Device name can only contain letters, numbers, spaces, hyphens, underscores, and periods");

        RuleFor(x => x.SharedSecret)
            .NotEmpty()
            .WithMessage("Shared secret is required")
            .MinimumLength(8)
            .WithMessage("Shared secret must be at least 8 characters");
    }
}
