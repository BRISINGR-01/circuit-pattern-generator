import Debug from "./Debug";

type ProbabilityTable = { [key: string]: number };

export enum Direction {
	Up,
	Right,
	Down,
	Left,
}

export enum Action {
	Up,
	UpLeft,
	UpRight,
	End,
}
const totalAmountOfActions = Object.keys(Action).length;

export type Segment = { action: Action; direction: Direction; start: Position; end: Position; level: number };

export class Position {
	constructor(public x: number, public y: number) {}

	get asArray(): [number, number] {
		return [this.x, this.y];
	}

	clone() {
		return new Position(this.x, this.y);
	}

	add(pos: Position) {
		const newNode = this.clone();

		newNode.x += pos.x;
		newNode.y += pos.y;
		return newNode;
	}

	scale(n: number) {
		const newNode = this.clone();

		newNode.x *= n;
		newNode.y *= n;
		return newNode;
	}

	equals(o: Position) {
		return o.x === this.x && o.y === this.y;
	}
}

export function calculateNextNodeOffset(action: Action, direction: Direction) {
	if (action == Action.End) return new Position(0, 0);

	const generalDir = direction === Direction.Down || direction === Direction.Right ? 1 : -1;
	const isVertical = direction === Direction.Up || direction === Direction.Down ? 1 : -1;

	let offset = 0;
	if (action == Action.UpRight) {
		offset = generalDir * isVertical;
	} else if (action == Action.UpLeft) {
		offset = -generalDir * isVertical;
	}

	const pos = [offset, generalDir] as [number, number];

	if (isVertical === -1) pos.reverse();

	return new Position(...pos);
}

function chooseFromProbTable<T extends ProbabilityTable>(table: T): keyof T {
	let prob = Math.random();

	for (const val of Object.keys(table)) {
		prob -= table[val];

		if (prob <= 0) return val;
	}

	throw new Error("Invalid probability table");
}

function tableWithout<T extends ProbabilityTable>(removedProperty: keyof T, table: T) {
	const leftProperties = Object.keys(table).filter((prop) => prop !== removedProperty);

	const leftProbability = table[removedProperty] / leftProperties.length;

	const newTable: ProbabilityTable = {};

	for (const key of leftProperties) {
		newTable[key] = table[key] + leftProbability;
	}

	return newTable;
}

type CircuitNode = {
	position: Position;
	direction: Direction;
	level: number;
};

export default class CircuitPatternGenerator {
	private nodes: CircuitNode[];
	private nextNodes: CircuitNode[] = [];

	constructor(private hSegments: number, private vSegments: number, startingNodes?: CircuitNode[]) {
		this.hSegments++; // make sure enough nodes are generated
		this.vSegments++;

		this.nodes =
			startingNodes ??
			[Direction.Up, Direction.Right, Direction.Down, Direction.Left].map<CircuitNode>((direction) => ({
				position: new Position(0, 0),
				direction,
				level: 0,
			}));

		Debug.reset();
	}

	public next() {
		const segments: Segment[] = [];

		Debug.reset();

		for (const node of this.nodes) {
			for (const action of this.generateActions(node)) {
				const nextPos = node.position.add(calculateNextNodeOffset(action, node.direction));

				segments.push({
					action,
					direction: node.direction,
					start: node.position,
					end: nextPos,
					level: node.level,
				});

				if (action != Action.End) {
					const newNode = { ...node, position: nextPos, level: node.level + 1 };

					Debug.addToLast({
						nextNode: {
							position: nextPos,
							isInBounds: this.isInBounds(newNode),
							isAvailable: this.isAvailable(newNode.position),
							bounds: {
								h: this.hSegments,
								v: this.vSegments,
								m: {
									l: `${(-this.hSegments / 2).toFixed(2)} - ${-this.hSegments / 2 <= newNode.position.x}`,
									r: `${(this.hSegments / 2).toFixed(2)} - ${newNode.position.x <= this.hSegments / 2}`,
									b: `${(-this.vSegments / 2).toFixed(2)} - ${-this.vSegments / 2 <= newNode.position.y}`,
									t: `${(this.vSegments / 2).toFixed(2)} - ${newNode.position.y <= this.vSegments / 2}`,
								},
							},
						},
					});

					if (this.isInBounds(newNode) && this.isAvailable(newNode.position)) this.nextNodes.push(newNode);
				}
			}
		}

		this.nodes = this.nextNodes;
		this.nextNodes = [];
		return segments;
	}

	// private generateSide(direction: Direction): Segment[] {}

	private generateActions(node: CircuitNode) {
		const isFirstLevel = node.position.y === 0;
		const levelProgress = this.calculateProgress(node);

		const splitChance = 1;
		// const splitChance = Math.max(0.0002, Math.sin(Math.PI / 3 / (node.position.y || 1)));

		const splitStrategy = chooseFromProbTable({
			"no-split": 1 - splitChance,
			"slpit-2": (splitChance * 2) / 3,
			"slpit-3": splitChance / 3,
		});

		// const splitStrategy = chooseFromProbTable({
		// 	"no-split": 0.8,
		// 	"slpit-2": 0.11,
		// 	"slpit-3": 0.9,
		// });

		let actionsAmount;
		switch (splitStrategy) {
			case "no-split":
				actionsAmount = 1;
				break;
			case "slpit-2":
				actionsAmount = 2;
				break;
			case "slpit-3":
				actionsAmount = 3;
				break;
			default:
				throw new Error(`Invalid splitting strategy "${splitStrategy}"`);
		}

		const actions: Action[] = [];

		let actionProbTable: ProbabilityTable = {
			[Action.Up]: 0.5,
			[Action.UpLeft]: 0.25,
			[Action.UpRight]: 0.25,
		};

		// const chanceOfEnd = Math.max(0.1, node.position.y / 100);
		const levelHasSufficientNodes =
			!isFirstLevel && this.nodes.filter((other) => other.position.y === node.position.y).length > 2;

		const chanceOfEnd = levelHasSufficientNodes ? levelProgress / 100 : 0;

		const debugData = {
			...node,
			direction: Object.values(Direction)[node.direction],
			splitChance,
			splitStrategy,
			actionsAmount,
			levelHasSufficientNodes,
			forbiddenActions: [] as Action[],
		};

		if (chooseFromProbTable({ end: chanceOfEnd, "no-end": 1 - chanceOfEnd }) === "end") {
			Debug.add({ ...debugData, actions: ["End"] });
			return [Action.End];
		}

		for (let i = 0; i < actionsAmount && i < totalAmountOfActions; i++) {
			const action = chooseFromProbTable(actionProbTable) as Action;

			if (!isActionAllowed(action, node, this.nextNodes)) {
				debugData.forbiddenActions.push(action);
				actionsAmount++;
				continue;
			}

			actions.push(action);
			actionProbTable = tableWithout(action, actionProbTable);
		}

		if (actions.length === 0) {
			Debug.add({ ...debugData, actions: ["End"] });
			return [Action.End];
		}

		Debug.add({ ...debugData, actions: actions.map((action) => Object.values(Action)[action]) });
		return actions;
	}

	calculateProgress(node: CircuitNode) {
		const total =
			node.direction === Direction.Down || node.direction === Direction.Up ? this.vSegments : this.hSegments;

		return node.position.y / total;
	}

	isInBounds(node: CircuitNode) {
		return (
			-this.hSegments / 2 <= node.position.x &&
			node.position.x <= this.hSegments / 2 &&
			-this.vSegments / 2 <= node.position.y &&
			node.position.y <= this.vSegments / 2
		);
	}

	isAvailable(pos: Position) {
		return !this.nodes.some((node) => pos.x === node.position.x && pos.y === node.position.y);
	}
}

function isActionAllowed(action: Action, currentNode: CircuitNode, allNodes: CircuitNode[]) {
	if (action === Action.End) return true;

	const nextPos = currentNode.position.add(calculateNextNodeOffset(action, currentNode.direction));

	for (const node of allNodes) {
		if (node.position.y !== nextPos.y) continue;
		if (node.position.x === nextPos.x) return false;
	}

	return true;
}
