import { writable } from 'svelte/store';

export interface NodeEvent {
	type: 'openDetails' | 'openChat' | 'expand' | 'click';
	nodeId: string;
	nodeData: any;
}

export const mindMapEvents = writable<NodeEvent | null>(null);

export const emitNodeEvent = (event: NodeEvent) => {
	mindMapEvents.set(event);
};

export const clearNodeEvent = () => {
	mindMapEvents.set(null);
};
