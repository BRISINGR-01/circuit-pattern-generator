import { Action, calculateNextNodeOffset, Position, type Segment } from "../circuitPattern";
import type CanvasSegment from "./CanvasSegment";
import Line from "./Line";
import { drawCursor } from "./utils";

export default class End implements CanvasSegment {
	line: Line;
	position: Position;
	r: number;
	level: number;

	constructor(segment: Segment, size: number) {
		this.level = segment.level;
		this.r = size / 10;
		// to put the element in the middle
		// const lineLength = (size - this.r) / 2;
		const lineLength = (size - this.r) / 4;

		const offset = calculateNextNodeOffset(Action.Up, segment.direction);
		const rOffset = offset.scale(lineLength + this.r);

		this.position = new Position(segment.start.x + rOffset.x, segment.start.y + rOffset.y);
		this.line = new Line({
			...segment,
			end: segment.start.add(offset.scale(lineLength)),
			action: Action.Up,
		});
	}

	draw(progress: number, ctx: CanvasRenderingContext2D, shouldDrawCursor: boolean, isDisapearing?: boolean) {
		this.line.draw(Math.min(1, progress * 2), ctx, shouldDrawCursor, isDisapearing);

		const arcProgress = 2 * Math.PI * (isDisapearing ? 1 - progress : progress);

		ctx.beginPath();
		ctx.arc(...this.position.asArray, this.r, 0, arcProgress);
		ctx.stroke();
		ctx.closePath();

		if (shouldDrawCursor && progress < 1) {
			drawCursor(
				[this.position.x + this.r * Math.cos(arcProgress), this.position.y + this.r * Math.sin(arcProgress)],
				ctx
			);
		}
	}
}
