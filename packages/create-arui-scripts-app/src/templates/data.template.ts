import { type TemplateContext } from '../types.js';

const MOCK_POSTS = `const MOCK_POSTS: Post[] = [
    { id: 1, title: 'Первый пост' },
    { id: 2, title: 'Второй пост' },
    { id: 3, title: 'Третий пост' },
];`;

export function postsApiTemplate(): string {
    return `import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export type Post = {
    id: number;
    title: string;
};

${MOCK_POSTS}

export const postsApi = createApi({
    reducerPath: 'postsApi',
    baseQuery: fakeBaseQuery(),
    endpoints: (builder) => ({
        getPosts: builder.query<Post[], void>({
            queryFn: async () => ({ data: MOCK_POSTS }),
        }),
    }),
});

export const { useGetPostsQuery } = postsApi;
`;
}

export function postsFetchTemplate(): string {
    return `export type Post = {
    id: number;
    title: string;
};

${MOCK_POSTS}

export async function fetchPosts(): Promise<Post[]> {
    return MOCK_POSTS;
}
`;
}

export function postsListTemplate(ctx: TemplateContext): string {
    if (ctx.useRtk) {
        return `import React from 'react';

import { Typography } from '@alfalab/core-components/typography';

import { useGetPostsQuery } from '../store/posts-api';

export function PostsList() {
    const { data, isError, isLoading } = useGetPostsQuery();

    if (isLoading) {
        return <Typography.Text view='primary-medium'>Загрузка постов…</Typography.Text>;
    }

    if (isError) {
        return <Typography.Text view='primary-medium'>Не удалось загрузить посты</Typography.Text>;
    }

    return (
        <ul>
            {(data ?? []).map((post) => (
                <li key={post.id}>
                    <Typography.Text view='primary-medium'>{post.title}</Typography.Text>
                </li>
            ))}
        </ul>
    );
}
`;
    }

    return `import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Typography } from '@alfalab/core-components/typography';

import { fetchPosts } from '../api/posts';

export function PostsList() {
    const { data, isError, isLoading } = useQuery({
        queryKey: ['posts'],
        queryFn: fetchPosts,
    });

    if (isLoading) {
        return <Typography.Text view='primary-medium'>Загрузка постов…</Typography.Text>;
    }

    if (isError) {
        return <Typography.Text view='primary-medium'>Не удалось загрузить посты</Typography.Text>;
    }

    return (
        <ul>
            {(data ?? []).map((post) => (
                <li key={post.id}>
                    <Typography.Text view='primary-medium'>{post.title}</Typography.Text>
                </li>
            ))}
        </ul>
    );
}
`;
}
