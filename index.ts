export type SpritorAnimation = {
    /**
     * An array of frame numbers that make up the animation
     */
    keyframes: number[];

    /**
     * Number of times the animation should loop
     */
    iterations: number;

    /**
     * The speed of the animation in frames per second
     */
    framerate: number;
}

export class Spritor {
    private frames: Record<string, string>[] = [];
    private spritesheetWidth: number = 0;
    private spritesheetHeight: number = 0;
    private currentAnimation: Animation | null = null;
    private resizeObserver: ResizeObserver | null = null;

    /**
     * Hook triggered once the spritesheet is fully loaded, processed, and applied to the element.
     */
    public onload: (() => void) | null = null;

    /**
     * Hook triggered once the current Spritor Animation finishes
     */
    public onfinish: (() => void) | null = null;

    constructor(
        public readonly element: HTMLElement,
        public readonly spritesheetSrc: string,
        public readonly spriteWidth: number,
        public readonly spriteHeight: number,
    ) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = this.spritesheetSrc;

        img.onload = (event: Event): void => {
            const canvas = document.createElement('canvas');
            this.spritesheetWidth = img.naturalWidth;
            this.spritesheetHeight = img.naturalHeight;
            canvas.width = this.spritesheetWidth;
            canvas.height = this.spritesheetHeight;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                if (blob instanceof Blob) {
                    const blobUrl = URL.createObjectURL(blob);
                    this.element.style.backgroundImage = `url("${blobUrl}")`;
                    this.element.style.backgroundSize = 'cover';
                    this.element.style.imageRendering = 'pixelated';
                    this.element.style.backgroundAttachment = 'scroll';

                    // Generate frame coordinate map
                    this.calculateFrames();

                    // Trigger onload callback
                    if (this.onload) {
                        this.onload();
                    }
                }
            }, 'image/png');
        };

        // Setup ResizeObserver to automatically update coordinates on resize
        this.resizeObserver = new ResizeObserver(() => {
            this.calculateFrames();
        });
        this.resizeObserver.observe(element);
    }

    private calculateFrames(): void {
        if (this.spritesheetWidth === 0 || this.spritesheetHeight === 0) return;

        // Correct row/column calculation based on standard sprite layouts
        const columns = Math.floor(this.spritesheetWidth / this.spriteWidth);
        const rows = Math.floor(this.spritesheetHeight / this.spriteHeight);

        this.frames = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
                // Scaled offset mapping based on current element dimensions
                const posX = x * this.element.clientWidth;
                const posY = y * this.element.clientHeight;
                this.frames.push({
                    backgroundPosition: `-${posX}px -${posY}px`
                });
            }
        }
    }

    public play(animationDef: SpritorAnimation): void {
        this.stop();

        if (this.frames.length === 0) {
            return;
        }

        // Map frame indices to actual frame styles (e.g., const idleAnimation = this.frames.slice(151, 156))
        const keyframeStyles = animationDef.keyframes.map(index => {
            return this.frames[index] || { backgroundPosition: '0px 0px' };
        });

        // Calculate duration per frame in milliseconds based on framerate
        const durationPerFrame = 1000 / animationDef.framerate;
        const totalDuration = durationPerFrame * keyframeStyles.length;

        this.currentAnimation = this.element.animate(keyframeStyles, {
            duration: totalDuration,
            iterations: animationDef.iterations,
            easing: `steps(${keyframeStyles.length - 1})`, // Ensures instant snapping between sprites instead of smooth sliding
        });
        this.currentAnimation.onfinish = (event: Event): void => {
            // Trigger onfinish callback
            if (this.onfinish) {
                this.onfinish();
            }
        }
    }

    public stop(): void {
        if (this.currentAnimation) {
            this.currentAnimation.cancel();
            this.currentAnimation = null;
        }
    }

    public destroy(): void {
        this.stop();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}