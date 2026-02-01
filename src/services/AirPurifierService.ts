import { Logging } from 'homebridge';
import { BlynkService } from './BlynkService';

const BASE_URL = 'https://dashboard.windmillair.com';

export enum AirPurifierPin {
    POWER = 'V0',
    PM25 = 'V1',
    MODE = 'V2',
    SLEEP_SOUND = 'V4',
    AUTOFADE = 'V5',
    CHILD_LOCK = 'V6',
    FILTER_LIFE = 'V7',
    BEEPING = 'V10',
}

// Sleep sound options
export enum SleepSound {
    WHISPER = 'Whisper',
    WHITE_NOISE = 'White Noise',
}

// Integer values sent to API
enum AirPurifierModeInt {
    LOW = 0,
    MEDIUM = 2,
    HIGH = 3,
    BOOST = 4,
    ECO = 5,
    SLEEP = 6,
}

// String values returned by API
export enum AirPurifierMode {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
    BOOST = 'Boost',
    ECO = 'Eco',
    SLEEP = 'Sleep',
}

export class AirPurifierService extends BlynkService {

  constructor(token: string, private readonly log: Logging) {
    super({ serverAddress: BASE_URL, token });
  }

  public async getPower(): Promise<boolean> {
    this.log.debug('Getting air purifier power');
    const value = await this.getPinValue(AirPurifierPin.POWER);
    this.log.debug(`Air purifier power is ${value}`);
    return value === '1';
  }

  public async getPM25(): Promise<number> {
    this.log.debug('Getting PM2.5');
    const value = await this.getPinValue(AirPurifierPin.PM25);
    this.log.debug(`PM2.5 is ${value}`);
    return parseInt(value, 10) || 0;
  }

  public async getMode(): Promise<AirPurifierMode> {
    this.log.debug('Getting air purifier mode');
    const value = await this.getPinValue(AirPurifierPin.MODE);
    this.log.debug(`Air purifier mode is ${value}`);
    return value as AirPurifierMode;
  }

  public async getFilterLife(): Promise<number> {
    this.log.debug('Getting filter life');
    const value = await this.getPinValue(AirPurifierPin.FILTER_LIFE);
    this.log.debug(`Filter life is ${value}%`);
    return parseInt(value, 10) || 0;
  }

  public async getChildLock(): Promise<boolean> {
    this.log.debug('Getting child lock');
    const value = await this.getPinValue(AirPurifierPin.CHILD_LOCK);
    this.log.debug(`Child lock is ${value}`);
    return value === '1';
  }

  public async getAutofade(): Promise<boolean> {
    this.log.debug('Getting autofade');
    const value = await this.getPinValue(AirPurifierPin.AUTOFADE);
    this.log.debug(`Autofade is ${value}`);
    return value === '1';
  }

  public async setPower(value: boolean): Promise<void> {
    this.log.debug(`Setting air purifier power to ${value}`);
    await this.setPinValue(AirPurifierPin.POWER, value ? '1' : '0');
  }

  public async setMode(value: AirPurifierMode): Promise<void> {
    this.log.debug(`Setting air purifier mode to ${value}`);
    let modeInt: AirPurifierModeInt;
    switch (value) {
      case AirPurifierMode.LOW:
        modeInt = AirPurifierModeInt.LOW;
        break;
      case AirPurifierMode.MEDIUM:
        modeInt = AirPurifierModeInt.MEDIUM;
        break;
      case AirPurifierMode.HIGH:
        modeInt = AirPurifierModeInt.HIGH;
        break;
      case AirPurifierMode.BOOST:
        modeInt = AirPurifierModeInt.BOOST;
        break;
      case AirPurifierMode.ECO:
        modeInt = AirPurifierModeInt.ECO;
        break;
      case AirPurifierMode.SLEEP:
        modeInt = AirPurifierModeInt.SLEEP;
        break;
      default:
        modeInt = AirPurifierModeInt.ECO;
    }
    await this.setPinValue(AirPurifierPin.MODE, modeInt.toString());
  }

  public async setChildLock(value: boolean): Promise<void> {
    this.log.debug(`Setting child lock to ${value}`);
    await this.setPinValue(AirPurifierPin.CHILD_LOCK, value ? '1' : '0');
  }

  public async setAutofade(value: boolean): Promise<void> {
    this.log.debug(`Setting autofade to ${value}`);
    await this.setPinValue(AirPurifierPin.AUTOFADE, value ? '1' : '0');
  }

  public async getBeeping(): Promise<boolean> {
    this.log.debug('Getting beeping');
    const value = await this.getPinValue(AirPurifierPin.BEEPING);
    this.log.debug(`Beeping is ${value}`);
    return value === '1';
  }

  public async setBeeping(value: boolean): Promise<void> {
    this.log.debug(`Setting beeping to ${value}`);
    await this.setPinValue(AirPurifierPin.BEEPING, value ? '1' : '0');
  }

  public async getSleepSound(): Promise<SleepSound> {
    this.log.debug('Getting sleep sound');
    const value = await this.getPinValue(AirPurifierPin.SLEEP_SOUND);
    this.log.debug(`Sleep sound is ${value}`);
    return value as SleepSound;
  }

  public async setSleepSound(value: SleepSound): Promise<void> {
    this.log.debug(`Setting sleep sound to ${value}`);
    // The API accepts the string value directly for this pin
    await this.setPinValue(AirPurifierPin.SLEEP_SOUND, value);
  }

  // Check if sleep sound is White Noise (for HomeKit switch - ON = White Noise, OFF = Whisper)
  public async isWhiteNoise(): Promise<boolean> {
    const sound = await this.getSleepSound();
    return sound === SleepSound.WHITE_NOISE;
  }

  public async setWhiteNoise(enabled: boolean): Promise<void> {
    await this.setSleepSound(enabled ? SleepSound.WHITE_NOISE : SleepSound.WHISPER);
  }

  // Helper to convert mode to a rotation speed percentage (for HomeKit)
  public modeToRotationSpeed(mode: AirPurifierMode): number {
    switch (mode) {
      case AirPurifierMode.SLEEP:
        return 10;
      case AirPurifierMode.LOW:
        return 25;
      case AirPurifierMode.MEDIUM:
        return 50;
      case AirPurifierMode.HIGH:
        return 75;
      case AirPurifierMode.BOOST:
        return 100;
      case AirPurifierMode.ECO:
        return 40; // Eco is similar to medium
      default:
        return 50;
    }
  }

  // Helper to convert rotation speed to mode (for HomeKit)
  public rotationSpeedToMode(speed: number): AirPurifierMode {
    if (speed <= 15) {
      return AirPurifierMode.SLEEP;
    } else if (speed <= 30) {
      return AirPurifierMode.LOW;
    } else if (speed <= 45) {
      return AirPurifierMode.ECO;
    } else if (speed <= 60) {
      return AirPurifierMode.MEDIUM;
    } else if (speed <= 85) {
      return AirPurifierMode.HIGH;
    } else {
      return AirPurifierMode.BOOST;
    }
  }
}
