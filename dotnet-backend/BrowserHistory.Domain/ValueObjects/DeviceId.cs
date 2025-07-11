namespace BrowserHistory.Domain.ValueObjects;

/// <summary>
/// Strong-typed identifier for devices to prevent primitive obsession
/// </summary>
public readonly record struct DeviceId
{
    private readonly Guid _value;

    private DeviceId(Guid value)
    {
        if (value == Guid.Empty)
            throw new ArgumentException("DeviceId cannot be empty", nameof(value));
        
        _value = value;
    }

    /// <summary>
    /// Creates a new DeviceId with a new GUID
    /// </summary>
    public static DeviceId New() => new(Guid.NewGuid());

    /// <summary>
    /// Creates a DeviceId from an existing GUID
    /// </summary>
    public static DeviceId From(Guid value) => new(value);

    /// <summary>
    /// Creates a DeviceId from a string representation
    /// </summary>
    public static DeviceId From(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("DeviceId string cannot be null or empty", nameof(value));

        if (!Guid.TryParse(value, out var guid))
            throw new ArgumentException("Invalid DeviceId format", nameof(value));

        return new DeviceId(guid);
    }

    public Guid Value => _value;

    public override string ToString() => _value.ToString();

    public static implicit operator Guid(DeviceId deviceId) => deviceId._value;
    public static explicit operator DeviceId(Guid guid) => From(guid);
    public static explicit operator DeviceId(string value) => From(value);
}
