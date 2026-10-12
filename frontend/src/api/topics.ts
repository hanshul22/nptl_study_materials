import { ENDPOINTS, type TopicCreate, type TopicUpdate } from '@study/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import { ApiClientError } from './errors';

/** One key for the whole topic list; every mutation invalidates it. */
export const TOPICS_KEY = ['topics'] as const;

export const useTopics = () =>
  useQuery({ queryKey: TOPICS_KEY, queryFn: () => request(ENDPOINTS.listTopics) });

/** Returns the invalidation, so `onSuccess`/`onError` can return it and the mutation waits for the refetch. */
function useInvalidateTopics() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TOPICS_KEY });
}

export function useCreateTopic() {
  const invalidate = useInvalidateTopics();
  return useMutation({
    mutationFn: (body: TopicCreate) => request(ENDPOINTS.createTopic, { body }),
    onSuccess: invalidate,
  });
}

export function useUpdateTopic() {
  const invalidate = useInvalidateTopics();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TopicUpdate }) =>
      request(ENDPOINTS.updateTopic, { params: { topicId: id }, body }),
    onSuccess: invalidate,
    // The topic is gone on the server: refresh so the list stops showing it.
    onError: (err) => (isNotFound(err) ? invalidate() : undefined),
  });
}

export function useDeleteTopic() {
  const invalidate = useInvalidateTopics();
  return useMutation({
    mutationFn: (id: string) => request(ENDPOINTS.deleteTopic, { params: { topicId: id } }),
    onSuccess: invalidate,
    onError: (err) => (isNotFound(err) ? invalidate() : undefined),
  });
}

const isNotFound = (err: unknown) => err instanceof ApiClientError && err.code === 'NOT_FOUND';
