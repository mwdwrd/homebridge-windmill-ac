# homebridge-windmill-ac

This [Homebridge](https://homebridge.io/) plugin provides accessories for [Windmill Air Conditioners](https://windmillair.com/) and **Windmill Air Purifiers**.

## Supported Devices

- **Windmill AC** - Full thermostat, fan control, and power consumption monitoring
- **Windmill Air Purifier** - Power, fan speed/mode, air quality monitoring, filter status, and additional controls

## How It Works

### Air Conditioner

The AC plugin exposes a thermostat accessory, fan accessory, and power consumption sensor.

#### Thermostat Modes

| HomeKit Mode | Windmill Mode                 |
|--------------|-------------------------------|
| OFF          | Turns off the air conditioner |
| HEAT         | Fan                           |
| COOL         | Cool                          |
| AUTO         | Eco                           |

#### Fan Speeds

| HomeKit Speed | Windmill Speed |
|---------------|----------------|
| 0             | Auto           |
| 1 - 33        | Low            |
| 34 - 66       | Medium         |
| 67 - 100      | High           |

#### Power Consumption

The AC exposes a light sensor that displays power consumption in watts (shown as "lux" in HomeKit). This is a common workaround since HomeKit doesn't have a native power meter characteristic.

### Air Purifier

The Air Purifier plugin exposes an air purifier accessory with air quality sensor, filter maintenance status, and additional control switches.

#### Features

- **Power On/Off** - Turn the purifier on or off
- **Fan Speed** - Control the operating mode via the speed slider
- **Air Quality Sensor** - Real-time PM2.5 readings with quality levels
- **Filter Status** - Filter life percentage with change indicator (alerts when below 20%)
- **Child Lock** - Lock/unlock physical controls on the device
- **Autofade** - Toggle display auto-dimming
- **Beeping** - Toggle button sounds
- **White Noise** - Toggle between White Noise (ON) and Whisper (OFF) sleep sounds

#### Fan Speed to Mode Mapping

| HomeKit Speed | Windmill Mode |
|---------------|---------------|
| 0 - 15        | Sleep         |
| 16 - 30       | Low           |
| 31 - 45       | Eco           |
| 46 - 60       | Medium        |
| 61 - 85       | High          |
| 86 - 100      | Boost         |

#### Air Quality Levels

Based on EPA PM2.5 guidelines:

| PM2.5 (µg/m³) | HomeKit Quality |
|---------------|-----------------|
| 0 - 12        | Excellent       |
| 13 - 35       | Good            |
| 36 - 55       | Fair            |
| 56 - 150      | Inferior        |
| 150+          | Poor            |

## Configuration

### Finding Your Auth Token

Your Auth Token is visible directly in the Windmill Dashboard:

1. Login to the [Windmill Air Dashboard](https://dashboard.windmillair.com/)
2. Navigate to **Devices**
3. Your Auth Token is displayed in the **Auth Token** column for each device

### Recommended Configuration

Use the [homebridge-config-ui-x plugin](https://github.com/homebridge/homebridge-config-ui-x) or [HOOBS](https://hoobs.com/) for the easiest setup experience.

### JSON Configuration

Add entries to the `accessories` array in your Homebridge `config.json`:

#### Air Conditioner

```json
{
    "accessory": "HomebridgeWindmillAC",
    "name": "Bedroom AC",
    "token": "<YOUR_AC_AUTH_TOKEN>"
}
```

#### Air Purifier

```json
{
    "accessory": "HomebridgeWindmillAirPurifier",
    "name": "Bedroom Air Purifier",
    "token": "<YOUR_AIR_PURIFIER_AUTH_TOKEN>"
}
```

#### Full Example

```json
{
    "accessories": [
        {
            "accessory": "HomebridgeWindmillAC",
            "name": "Bedroom AC",
            "token": "<YOUR_AC_AUTH_TOKEN>"
        },
        {
            "accessory": "HomebridgeWindmillAC",
            "name": "Living Room AC",
            "token": "<YOUR_AC_AUTH_TOKEN>"
        },
        {
            "accessory": "HomebridgeWindmillAirPurifier",
            "name": "Bedroom Air Purifier",
            "token": "<YOUR_AIR_PURIFIER_AUTH_TOKEN>"
        },
        {
            "accessory": "HomebridgeWindmillAirPurifier",
            "name": "Living Room Air Purifier",
            "token": "<YOUR_AIR_PURIFIER_AUTH_TOKEN>"
        }
    ]
}
```

## Troubleshooting

### Device Shows as "Not Responding"

- Verify your Auth Token is correct
- Check that your device is online in the Windmill Dashboard
- Ensure your Homebridge server has internet access

### Air Purifier Filter Alert

The filter change indicator will alert you when filter life drops below 20%. Replace your filter and the status will update automatically.

### Power Consumption Shows as "Lux"

This is expected. HomeKit doesn't have a native power meter, so we use a light sensor where the "lux" value represents watts. Third-party apps like Eve may display this more intuitively.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint
```

## Changelog

### v1.2.0
- Added Air Purifier support
- Added PM2.5 air quality sensor
- Added filter life monitoring
- Added child lock control
- Added autofade, beeping, and white noise switches for Air Purifier
- Added power consumption monitoring for AC

### v1.1.0
- Fixed fan speed behavior when changing modes
- Improved temperature handling

### v1.0.0
- Initial release with AC support

## License

Apache-2.0
