import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';
import { AIR_PURIFIER_ACCESSORY_NAME } from './settings';
import { WindmillAirPurifierAccessoryConfig } from './types';
import { AirPurifierMode, AirPurifierService } from './services/AirPurifierService';
import { sleep } from './helpers/sleep';

let hap: HAP;

export function initAirPurifierAccessory(api: API) {
  hap = api.hap;
  api.registerAccessory(AIR_PURIFIER_ACCESSORY_NAME, WindmillAirPurifierAccessory);
}

class WindmillAirPurifierAccessory implements AccessoryPlugin {
  private readonly airPurifier: AirPurifierService;

  private readonly log: Logging;
  private readonly config: WindmillAirPurifierAccessoryConfig;

  public readonly name: string;

  private readonly airPurifierService: Service;
  private readonly informationService: Service;
  private readonly airQualityService: Service;
  private readonly filterMaintenanceService: Service;
  private readonly autofadeSwitch: Service;
  private readonly beepingSwitch: Service;
  private readonly whiteNoiseSwitch: Service;

  constructor(log: Logging, config: AccessoryConfig) {
    this.log = log;
    this.config = config as WindmillAirPurifierAccessoryConfig;
    this.name = config.name;

    // Create a new Air Purifier service - handles communication with the Windmill API
    this.airPurifier = new AirPurifierService(this.config.token, this.log);

    // Create Accessory Information service
    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'The Air Lab, Inc.')
      .setCharacteristic(hap.Characteristic.Model, 'Windmill Air Purifier');

    // Create Air Purifier service
    this.airPurifierService = new hap.Service.AirPurifier(this.name);

    this.airPurifierService.getCharacteristic(hap.Characteristic.Active)
      .onGet(this.handleGetActive.bind(this))
      .onSet(this.handleSetActive.bind(this));

    this.airPurifierService.getCharacteristic(hap.Characteristic.CurrentAirPurifierState)
      .onGet(this.handleGetCurrentAirPurifierState.bind(this));

    this.airPurifierService.getCharacteristic(hap.Characteristic.TargetAirPurifierState)
      .onGet(this.handleGetTargetAirPurifierState.bind(this))
      .onSet(this.handleSetTargetAirPurifierState.bind(this));

    this.airPurifierService.getCharacteristic(hap.Characteristic.RotationSpeed)
      .onGet(this.handleGetRotationSpeed.bind(this))
      .onSet(this.handleSetRotationSpeed.bind(this));

    this.airPurifierService.getCharacteristic(hap.Characteristic.LockPhysicalControls)
      .onGet(this.handleGetLockPhysicalControls.bind(this))
      .onSet(this.handleSetLockPhysicalControls.bind(this));

    // Create Air Quality service
    this.airQualityService = new hap.Service.AirQualitySensor('Air Quality');
    this.airQualityService.getCharacteristic(hap.Characteristic.AirQuality)
      .onGet(this.handleGetAirQuality.bind(this));

    this.airQualityService.getCharacteristic(hap.Characteristic.PM2_5Density)
      .onGet(this.handleGetPM25Density.bind(this));

    // Create Filter Maintenance service
    this.filterMaintenanceService = new hap.Service.FilterMaintenance('Filter');
    this.filterMaintenanceService.getCharacteristic(hap.Characteristic.FilterChangeIndication)
      .onGet(this.handleGetFilterChangeIndication.bind(this));

    this.filterMaintenanceService.getCharacteristic(hap.Characteristic.FilterLifeLevel)
      .onGet(this.handleGetFilterLifeLevel.bind(this));

    // Create Autofade switch
    this.autofadeSwitch = new hap.Service.Switch('Autofade', 'autofade');
    this.autofadeSwitch.getCharacteristic(hap.Characteristic.On)
      .onGet(this.handleGetAutofade.bind(this))
      .onSet(this.handleSetAutofade.bind(this));

    // Create Beeping switch
    this.beepingSwitch = new hap.Service.Switch('Beeping', 'beeping');
    this.beepingSwitch.getCharacteristic(hap.Characteristic.On)
      .onGet(this.handleGetBeeping.bind(this))
      .onSet(this.handleSetBeeping.bind(this));

    // Create White Noise switch (ON = White Noise, OFF = Whisper)
    this.whiteNoiseSwitch = new hap.Service.Switch('White Noise', 'whitenoise');
    this.whiteNoiseSwitch.getCharacteristic(hap.Characteristic.On)
      .onGet(this.handleGetWhiteNoise.bind(this))
      .onSet(this.handleSetWhiteNoise.bind(this));

    // Link services
    this.airPurifierService.addLinkedService(this.airQualityService);
    this.airPurifierService.addLinkedService(this.filterMaintenanceService);
    this.airPurifierService.addLinkedService(this.autofadeSwitch);
    this.airPurifierService.addLinkedService(this.beepingSwitch);
    this.airPurifierService.addLinkedService(this.whiteNoiseSwitch);

    // Set the air purifier service as the primary service
    this.airPurifierService.setPrimaryService(true);
  }

  async identify(): Promise<void> {
    this.log.debug('Identify requested!');

    const currentPowerState = await this.airPurifier.getPower();
    await this.airPurifier.setPower(!currentPowerState);
    await sleep(3000);
    await this.airPurifier.setPower(currentPowerState);
  }

  // Air Purifier Active
  async handleGetActive(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET Active');
    const power = await this.airPurifier.getPower();
    return power ? hap.Characteristic.Active.ACTIVE : hap.Characteristic.Active.INACTIVE;
  }

  async handleSetActive(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET Active:', value);
    const isActive = value === hap.Characteristic.Active.ACTIVE;
    await this.airPurifier.setPower(isActive);
  }

  // Current Air Purifier State
  async handleGetCurrentAirPurifierState(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET CurrentAirPurifierState');
    const power = await this.airPurifier.getPower();

    if (!power) {
      return hap.Characteristic.CurrentAirPurifierState.INACTIVE;
    }

    // If power is on, check if actively purifying based on PM2.5 level
    const pm25 = await this.airPurifier.getPM25();
    if (pm25 > 0) {
      return hap.Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
    }

    return hap.Characteristic.CurrentAirPurifierState.IDLE;
  }

  // Target Air Purifier State (Manual vs Auto/Eco)
  async handleGetTargetAirPurifierState(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET TargetAirPurifierState');
    const mode = await this.airPurifier.getMode();

    // Eco mode is treated as "Auto"
    if (mode === AirPurifierMode.ECO) {
      return hap.Characteristic.TargetAirPurifierState.AUTO;
    }

    return hap.Characteristic.TargetAirPurifierState.MANUAL;
  }

  async handleSetTargetAirPurifierState(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET TargetAirPurifierState:', value);

    if (value === hap.Characteristic.TargetAirPurifierState.AUTO) {
      await this.airPurifier.setMode(AirPurifierMode.ECO);
    }
    // If setting to manual, keep the current mode (or set to Medium as default)
    // Don't change mode here - let rotation speed control the mode
  }

  // Rotation Speed (maps to air purifier modes)
  async handleGetRotationSpeed(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET RotationSpeed');
    const power = await this.airPurifier.getPower();

    if (!power) {
      return 0;
    }

    const mode = await this.airPurifier.getMode();
    return this.airPurifier.modeToRotationSpeed(mode);
  }

  async handleSetRotationSpeed(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET RotationSpeed:', value);
    const speed = parseInt(value.toString(), 10);

    if (speed === 0) {
      await this.airPurifier.setPower(false);
      return;
    }

    // Ensure power is on
    const power = await this.airPurifier.getPower();
    if (!power) {
      await this.airPurifier.setPower(true);
    }

    const mode = this.airPurifier.rotationSpeedToMode(speed);
    await this.airPurifier.setMode(mode);
  }

  // Lock Physical Controls (Child Lock)
  async handleGetLockPhysicalControls(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET LockPhysicalControls');
    const childLock = await this.airPurifier.getChildLock();
    return childLock
      ? hap.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
      : hap.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED;
  }

  async handleSetLockPhysicalControls(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET LockPhysicalControls:', value);
    const lockEnabled = value === hap.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED;
    await this.airPurifier.setChildLock(lockEnabled);
  }

  // Air Quality
  async handleGetAirQuality(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET AirQuality');
    const pm25 = await this.airPurifier.getPM25();

    // Convert PM2.5 to HomeKit Air Quality levels
    // Based on EPA AQI breakpoints for PM2.5
    if (pm25 <= 12) {
      return hap.Characteristic.AirQuality.EXCELLENT;
    } else if (pm25 <= 35) {
      return hap.Characteristic.AirQuality.GOOD;
    } else if (pm25 <= 55) {
      return hap.Characteristic.AirQuality.FAIR;
    } else if (pm25 <= 150) {
      return hap.Characteristic.AirQuality.INFERIOR;
    } else {
      return hap.Characteristic.AirQuality.POOR;
    }
  }

  async handleGetPM25Density(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET PM2_5Density');
    return await this.airPurifier.getPM25();
  }

  // Filter Maintenance
  async handleGetFilterChangeIndication(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET FilterChangeIndication');
    const filterLife = await this.airPurifier.getFilterLife();

    // Indicate filter change needed if below 20%
    if (filterLife < 20) {
      return hap.Characteristic.FilterChangeIndication.CHANGE_FILTER;
    }

    return hap.Characteristic.FilterChangeIndication.FILTER_OK;
  }

  async handleGetFilterLifeLevel(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET FilterLifeLevel');
    return await this.airPurifier.getFilterLife();
  }

  // Autofade switch handlers
  async handleGetAutofade(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET Autofade');
    return await this.airPurifier.getAutofade();
  }

  async handleSetAutofade(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET Autofade:', value);
    await this.airPurifier.setAutofade(value as boolean);
  }

  // Beeping switch handlers
  async handleGetBeeping(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET Beeping');
    return await this.airPurifier.getBeeping();
  }

  async handleSetBeeping(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET Beeping:', value);
    await this.airPurifier.setBeeping(value as boolean);
  }

  // White Noise switch handlers (ON = White Noise, OFF = Whisper)
  async handleGetWhiteNoise(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET WhiteNoise');
    return await this.airPurifier.isWhiteNoise();
  }

  async handleSetWhiteNoise(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET WhiteNoise:', value);
    await this.airPurifier.setWhiteNoise(value as boolean);
  }

  getServices(): Service[] {
    return [
      this.airPurifierService,
      this.informationService,
      this.airQualityService,
      this.filterMaintenanceService,
      this.autofadeSwitch,
      this.beepingSwitch,
      this.whiteNoiseSwitch,
    ];
  }
}
