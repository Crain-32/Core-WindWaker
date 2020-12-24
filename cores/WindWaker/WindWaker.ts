import { onTick, Preinit, Init, Postinit } from "modloader64_api/PluginLifecycle";
import { IRomHeader } from 'modloader64_api/IRomHeader';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IModLoaderAPI, ILogger, ICore, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { PayloadType } from "modloader64_api/PayloadType";
import IMemory from "modloader64_api/IMemory";
import fs from 'fs';
import path from 'path';
import * as API from './API/Imports';
import { GlobalContext, Link, SaveContext, WWHelper } from "./src/Imports";
import * as CORE from './src/Imports';

export class WindWaker implements ICore, API.IWWCore {
    header = "GZLE01";
    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as IModLoaderAPI;
    eventTicks: Map<string, Function> = new Map<string, Function>();
    link!: API.ILink;
    save!: API.ISaveContext;
    global!: API.IGlobalContext;
    helper!: API.IWWHelper;
    isSaveLoaded = false;
    touching_loading_zone = false;
    last_known_scene: string = "";
    scene_change_timer: number = 0;

    constructor() {
    }

    @Preinit(
    )
    preinit() {
        this.eventTicks.set('waitingForSaveload', () => {
            if (!this.isSaveLoaded && this.helper.isSceneNameValid() && !this.helper.isTitleScreen()) {
                this.isSaveLoaded = true;
                bus.emit(API.WWEvents.ON_SAVE_LOADED, {});
            }
        });
    }

    @Init()
    init(): void {
    }

    @Postinit()
    postinit(): void {
        this.global = new GlobalContext(this.ModLoader.emulator);
        this.link = new Link(this.ModLoader.emulator);
        this.save = new SaveContext(this.ModLoader.emulator);
        this.helper = new WWHelper(
            this.save,
            this.global,
            this.link,
            this.ModLoader.emulator
        );
    }

    @onTick()
    onTick() {
        if (this.helper.isTitleScreen() || !this.helper.isSceneNameValid()) return;

        /*if (!this.helper.isLinkControllable() && !this.touching_loading_zone) {
            bus.emit(API.WWEvents.ON_LOADING_ZONE, {});
            this.touching_loading_zone = true;
        }*/

        if (this.helper.isSceneChange()) {
            this.scene_change_timer += 1;
            if(this.scene_change_timer == 2) {
                bus.emit(API.WWEvents.ON_SCENE_CHANGE, this.global.next_scene_name.toString().replace(/\0.*$/g, ''));
                this.touching_loading_zone = false;
            }
        }
        if(this.helper.isLinkExists()) this.scene_change_timer = 0;

        this.eventTicks.forEach((value: Function, key: string) => {
            value();
        });
    }
}