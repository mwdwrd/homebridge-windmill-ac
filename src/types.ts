import { AccessoryConfig } from 'homebridge';

export interface WindmillThermostatAccessoryConfig extends AccessoryConfig {
    token: string;
}

export interface WindmillAirPurifierAccessoryConfig extends AccessoryConfig {
    token: string;
}