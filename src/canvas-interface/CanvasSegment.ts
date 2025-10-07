export default interface CanvasSegment {
	level: number;
	draw(progress: number, ctx: CanvasRenderingContext2D, drawCursor: boolean, isDisapearing?: boolean): void;
}
