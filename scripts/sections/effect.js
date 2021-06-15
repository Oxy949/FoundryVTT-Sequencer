import * as lib from "../lib.js";
import Section from "./base.js";

export default class EffectSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence)
        this.file(inFile);
        this._baseFolder = "";
        this._from = false;
        this._to = false;
        this._scaleMin = false;
        this._scaleMax = false;
        this._anchor = false;
        this._randomRotation = false;
        this._rotationOnly = true;
        this._missed = false;
        this._startPoint = 0;
        this._endPoint = 0;
        this._mustache = false;
        this._JB2A = false;
        this._randomX = false;
        this._randomY = false;
        this._playbackRate = 1.0;
        this._gridSize = canvas.grid.size;
        this._overrides = [];
        this._postOverrides = [];
        this._name = false;
        this._fadeIn = 0;
        this._fadeOut = 0;
    }

    /**
     * Causes the effect's position to be stored and can then be used  with .atLocation(), .reachTowards(),
     * and .rotateTowards() to refer to previous effects' locations
     *
     * @param {boolean} inName
     * @returns {EffectSection} this
     */
    name(inName){
        if(typeof inName !== "string") throw new Error("inBaseFolder must be of type string");
        this._name = inName;
        return this;
    }

    /**
     * Defines the base folder that will prepend to the file path. This is mainly just useful to make the file
     * path easier to manage.
     *
     * @param {string} inBaseFolder
     * @returns {EffectSection} this
     */
    baseFolder(inBaseFolder) {
        if(typeof inBaseFolder !== "string") throw new Error("inBaseFolder must be of type string");
        inBaseFolder = inBaseFolder.replace("\\", "/");
        if(!inBaseFolder.endsWith("/")) {
            inBaseFolder += "/";
        }
        this._baseFolder = inBaseFolder;
        return this;
    }

    /**
     * Declares which .webm to be played This may also be an array of paths, which will be randomly picked from each
     * time the effect is played.
     *
     * @param {string|array} inFile
     * @returns {EffectSection} this
     */
    file(inFile) {
        if(!(typeof inFile === "string" || Array.isArray(inFile))) {
            throw new Error("inFile must be of type string or array");
        }
        this._file = inFile;
        return this;
    }

    /**
     * Sets the effect's playback rate. A playback rate of 2.0 would make it play 2x as fast, 0.5 would make
     * it play half as fast.
     *
     * @param {number} inNumber
     * @returns {EffectSection} this
     */
    playbackRate(inNumber = 1.0) {
        if(typeof inNumber !== "number") throw new Error("inNumber must be of type number");
        this._playbackRate = inNumber;
        return this;
    }

    /**
     * Causes the effect to target a location close to the .reachTowards() location, but not on it.
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    missed(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._missed = inBool;
        return this;
    }

    /**
     * Sets the start point and end point to best work JB2A's effect sprites. This effectively sets start
     * point and end point to 200, and grid scale to 100.
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    JB2A(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        if(inBool) {
            this.gridSize(100);
            this.startPoint(200);
            this.endPoint(200);
        }else{
            this.gridSize(canvas.grid.size);
            this.startPoint(0);
            this.endPoint(0);
        }
        this._JB2A = true;
        return this;
    }

    /**
     * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
     * modifications of effect's data. For example, it could be manipulated to change which file will be used based
     * on the distance to the target.
     *
     * @param {function} inFunc
     * @returns {EffectSection} this
     */
    addOverride(inFunc) {
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    addPostOverride(inFunc) {
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._postOverrides.push(inFunc);
        return this;
    }

    /**
     * Sets the Mustache of the filepath. This is applied after the randomization of the filepath, if available.
     *
     * @param {object} inMustache
     * @returns {EffectSection} this
     */
    setMustache(inMustache) {
        this._mustache = inMustache;
        return this;
    }

    /**
     *  A smart method that can take a reference to a token, or a direct coordinate on the canvas to play the effect at,
     *  or a string reference (see .name())
     *
     * @param {Token|object|string} inLocation
     * @returns {EffectSection} this
     */
    atLocation(inLocation) {
        this._from = this._validateLocation(inLocation);
        return this;
    }

    /**
     *  Causes the effect to be rotated towards the given token, coordinates, or a string reference (see .name())
     *
     * @param {Token|object|string} inLocation
     * @returns {EffectSection} this
     */
    rotateTowards(inLocation) {
        this._to = this._validateLocation(inLocation);
        this._rotationOnly = true;
        return this;
    }

    /**
     *  Causes the effect to be rotated and stretched towards a token, coordinates, or a string reference (see .name())
     *  This effectively calculates the proper X scale for the effect to reach the target
     *
     * @param {Token|object|string} inLocation
     * @returns {EffectSection} this
     */
    reachTowards(inLocation) {
        this._to = this._validateLocation(inLocation);
        this._rotationOnly = false;
        return this;
    }

    /**
     *  Defines the start point within the given sprite, starting from the left of the sprite. An example
     *  would be a given number of `200` - means that the sprite will consider 200 pixels into the sprite as the
     *  'anchor point'
     *
     * @param {number} inStartPoint
     * @returns {EffectSection} this
     */
    startPoint(inStartPoint) {
        if(typeof inStartPoint !== "number") throw new Error("inStartPoint must be of type number");
        this._startPoint = inStartPoint;
        return this;
    }

    /**
     *  The same as the start point, except from the right and how many pixels to offset the target from
     *
     * @param {number} inEndPoint
     * @returns {EffectSection} this
     */
    endPoint(inEndPoint) {
        if(typeof inEndPoint !== "number") throw new Error("inEndPoint must be of type number");
        this._endPoint = inEndPoint;
        return this;
    }

    /**
     *  A method that can take the following:
     *  - A number to set the scale uniformly
     *  - An object with x and y for non-uniform scaling
     *  - Two numbers which the Sequencer will randomly pick a uniform scale between
     *
     * @param {number|object} inScaleMin
     * @param {number} [inScaleMax] inScaleMax
     * @returns {EffectSection} this
     */
    scale(inScaleMin, inScaleMax) {
        if(inScaleMin === undefined)  throw new Error("inScaleMin must be of type number or object");
        if (typeof inScaleMin !== "number") {
            if(inScaleMax && typeof inScaleMax === "number") throw new Error("if inScaleMax is a number, inScaleMin must also be of type number");
        }
        this._scaleMin = inScaleMin;
        this._scaleMax = inScaleMax ?? false;
        return this;
    }

    /**
     *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection} this
     */
    anchor(inAnchor) {
        if (typeof inAnchor === "number") {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        this._anchor = inAnchor;
        return this;
    }

    /**
     *  Centers the sprite, effectively giving it an anchor of {x: 0.5, y: 0.5}
     *
     *  Note: If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the
     *  outermost edge of the location the sprite is played at
     *
     * @returns {EffectSection} this
     */
    center() {
        this.anchor();
        return this;
    }

    /**
     * The sprite gets a random rotation, which means it should not be used with .reachTowards()
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    randomRotation(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomRotation = inBool;
        return this;
    }

    /**
     * The sprite gets a randomized flipped X scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its horizontal
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    randomizeMirrorX(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomX = true;
        return this;
    }

    /**
     * The sprite gets a randomized flipped Y scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its vertical axis
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    randomizeMirrorY(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomY = true;
        return this;
    }

    /**
     * Sets the grid size of the file loaded in the Effect. Some files have an established internal
     * grid, so this will make the effect scale up or down to match the active scene's grid size
     *
     * @param {number} inSize
     * @returns {EffectSection} this
     */
    gridSize(inSize) {
        if(typeof inSize !== "number") throw new Error("inSize must be of type number");
        this._gridSize = inSize;
        return this;
    }

    /**
     * Causes the effect to fade in when played
     *
     * @param {number} fadeDuration
     * @returns {EffectSection} this
     */
    fadeIn(fadeDuration) {
        if(typeof fadeDuration !== "number") throw new Error("fadeDuration must be of type number");
        this._fadeIn = fadeDuration;
        return this;
    }

    /**
     * Causes the effect to fade out at the end of the effect's duration
     *
     * @param {number} fadeDuration
     * @returns {EffectSection} this
     */
    fadeOut(fadeDuration) {
        if(typeof fadeDuration !== "number") throw new Error("fadeDuration must be of type number");
        this._fadeOut = fadeDuration;
        return this;
    }

    async _run(repetition) {
        let effect = this._cache[repetition];
        game.socket.emit("module.sequencereffects", effect);
        await canvas.sequencereffects.playEffect(effect);
    }

    async _sanitizeData() {

        let data = {
            file: this._file,
            position: {
                x: 0,
                y: 0,
            },
            anchor: {
                x: 0.0,
                y: 0.0
            },
            scale: {
                x: 1.0,
                y: 1.0
            },
            angle: 0,
            rotation: 0,
            speed: 0,
            playbackRate: this._playbackRate,
            _distance: 0,
            fadeIn: this._fadeIn,
            fadeOut: this._fadeOut,
        };

        if(this._anchor) {
            data.anchor = this._anchor;
        }

        if (this._from) {

            let [origin, target] = this._calculatePositions(this._from, this._to, this._missed);

            if(!this._anchor) {
                data.anchor = {
                    x: 0.5,
                    y: 0.5
                }
            }

            data.position = origin;

            if(this._to) {

                if(!this._anchor) {
                    data.anchor = {
                        x: 0.0,
                        y: 0.5
                    }
                }

                let ray = new Ray(origin, target);

                data._distance = ray.distance;

                data.rotation = ray.angle;

            }

        }

        data.rotation += this._randomRotation ? Math.random() * Math.PI : 0;

        for(let override of this._overrides) {
            data = await override(this, data);
        }

        if(Array.isArray(data.file)) {
            data.file = lib.random_array_element(data.file)
        }

        if(this._mustache) {
            let template = Handlebars.compile(data.file);
            data.file = template(this._mustache);
        }

        data.scale = {
            x: data.scale.x * (canvas.grid.size / this._gridSize),
            y: data.scale.y * (canvas.grid.size / this._gridSize)
        }

        if(!this._rotationOnly) {
            data = await this._calculateHitVector(data);
        }

        let scale = this._scaleMin;
        if (typeof this._scaleMin === "number") {
            if(this._scaleMax && typeof this._scaleMax === "number"){
                scale = lib.random_float_between(this._scaleMin, this._scaleMax);
            }
            scale = {
                x: scale,
                y: scale
            }
        }

        data.scale = {
            x: data.scale.x * (scale?.x ?? 1.0),
            y: data.scale.y * (scale?.y ?? 1.0)
        }

        let flipX = this._randomX && Math.random() < 0.5 ? -1 : 1;
        data.scale.x = data.scale.x * flipX;

        let flipY = this._randomY && Math.random() < 0.5 ? -1 : 1;
        data.scale.y = data.scale.y * flipY;

        data.file = (this._baseFolder + data.file);

        for(let override of this._postOverrides) {
            data = await override(this, data);
        }

        this.sequence._insertCachedPosition(this, this._getName(data), this._currentRepetition, data.position);

        return data;

    }

    async _getFileDimensions(inFile) {
        let filePath = this._baseFolder + inFile;
        if(this._JB2A) {
            let parts = filePath.replace(".webm", "").split("_");
            let dimensionString = parts[parts.length-1].toLowerCase().split('x');
            if(!isNaN(dimensionString[0]) && !isNaN(dimensionString[1])) {
                return {
                    x: Number(dimensionString[0]),
                    y: Number(dimensionString[1])
                }
            }
        }
        let cachedFile = this.sequence._getFileFromCache(filePath);
        if(!cachedFile) {
            cachedFile = await lib.getDimensions(filePath);
            this.sequence._addFileToCache(filePath, cachedFile)
        }
        return cachedFile;
    }

    _getTrueLength(inDimensions) {
        return inDimensions.x - this._startPoint - this._endPoint;
    }

    async _calculateHitVector(data) {

        if(data._distance === 0) return data;

        let dimensions = await this._getFileDimensions(data.file);
        let trueLength = this._getTrueLength(dimensions);

        data.scale.x = data._distance / trueLength;
        data.scale.y = Math.max(0.4, data.scale.x);

        data.anchor.x = this._startPoint / dimensions.x;

        return data;
    }

    _calculatePositions(from, to, missed) {

        if(typeof from === "string"){
            from = this.sequence._getCachedPosition(from, this._currentRepetition);
        }

        if(typeof to === "string"){
            to = this.sequence._getCachedPosition(to, this._currentRepetition);
        }

        let from_position = {
            x: from?.center?.x ?? from.x ?? 0,
            y: from?.center?.y ?? from.y ?? 0
        }

        let to_position = {
            x: to?.center?.x ?? to.x ?? 0,
            y: to?.center?.y ?? to.y ?? 0
        }

        if(to instanceof MeasuredTemplate){
            if(to.data.t === "cone" || to.data.t === "ray"){
                to_position.x = to.ray.B.x;
                to_position.y = to.ray.B.y;
            }
        }

        from_position = this._calculateMissedPosition(from, from_position, !to && missed);
        to_position = to ? this._calculateMissedPosition(to, to_position, missed) : false;

        return [from_position, to_position];

    }

    _calculateMissedPosition(target, position, missed){

        if(!missed) return position;

        let width = (target?.data?.width ?? 1) * canvas.grid.size;
        let height = (target?.data?.height ?? 1) * canvas.grid.size;

        let XorY = Math.random() < 0.5;
        let flipX = Math.random() < 0.5 ? -1 : 1;
        let flipY = Math.random() < 0.5 ? -1 : 1;

        let tokenOffset = canvas.grid.size / 5;

        // If it's X, random position in Y axis
        if(XorY) {
            position.x += ((width/2) + lib.random_float_between(tokenOffset, canvas.grid.size/2)) * flipX;
            position.y += lib.random_float_between(tokenOffset, (height/2) + canvas.grid.size/2) * flipY;
        }else{
            position.x += lib.random_float_between(tokenOffset, (width/2) + canvas.grid.size/2) * flipX;
            position.y += ((height/2) + lib.random_float_between(tokenOffset, canvas.grid.size/2)) * flipY;
        }

        return position;

    }

    _validateLocation(inLocation) {

        if(inLocation?._id) {
            inLocation = canvas.tokens.get(inLocation._id) ?? inLocation;
        }

        if (   inLocation instanceof Token
            || inLocation instanceof MeasuredTemplate
            || typeof inLocation === "string"
        ) return inLocation;

        return {
            x: inLocation?.x ?? 0,
            y: inLocation?.y ?? 0
        }

    }

    _getName(data){
        return this._name ? this._name : (data.file ? data.file.split('/').pop().split('.').shift() : "-1");
    }

}
