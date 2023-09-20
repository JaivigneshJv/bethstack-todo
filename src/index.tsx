import { Elysia, t } from "elysia";
import { html } from "@elysiajs/html";
import * as elements from "typed-html";
import { db } from "./db";
import { Todo, todos } from "./db/schema";
import { eq } from "drizzle-orm";

const app = new Elysia()
  .use(html())
  .get("/", ({ html }) =>
    html(
      <BaseHtml>
        <body>
          <div class="h-100 w-full flex items-center justify-center bg-teal-lightest font-sans">
            <div class="bg-white rounded shadow p-6 m-4 w-full lg:w-3/4 lg:max-w-lg">
              <div class="mb-4">
                <h1 class="text-grey-darkest">Todo List</h1>
                <div
                  hx-get="/todos"
                  hx-trigger="load"
                  hx-swap="innerHTML"
                ></div>
              </div>
            </div>
          </div>
        </body>
      </BaseHtml>
    )
  )
  .get("/todos", async () => {
    const data = await db.select().from(todos).all();
    return <TodoList todos={data} />;
  })
  .post(
    "/todos/toggle/:id",
    async ({ params }) => {
      const oldTodo = await db
        .select()
        .from(todos)
        .where(eq(todos.id, params.id))
        .get();
      const newTodo = await db
        .update(todos)
        .set({ completed: !oldTodo?.completed })
        .where(eq(todos.id, params.id))
        .returning()
        .get();

      return <TodoItem {...newTodo} />;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .delete(
    "/todos/:id",
    async ({ params }) => {
      await db.delete(todos).where(eq(todos.id, params.id)).run();
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .post(
    "/todos",
    async ({ body }) => {
      const newTodo = await db.insert(todos).values(body).returning().get();
      return <TodoItem {...newTodo} />;
    },
    {
      body: t.Object({
        content: t.String({ minLength: 1 }),
      }),
    }
  )
  .listen(8080);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

const BaseHtml = ({ children }: elements.Children) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<script src="https://unpkg.com/htmx.org/dist/htmx.min.js"></script>
	<script src="https://cdn.tailwindcss.com"></script>
	<title>TODO List</title>
</head>
${children}`;

function TodoItem({ content, completed, id }: Todo) {
  return (
    <div class="flex flex-row space-x-3">
      <p>{content}</p>
      <input
        type="checkbox"
        checked={completed}
        hx-post={`/todos/toggle/${id}`}
        hx-swap="outerHTML"
        hx-target="closest div"
      />
      <button
        class="flex-no-shrink p-2 ml-2 border-2 rounded text-red border-red hover:text-white hover:bg-red"
        hx-delete={`/todos/${id}`}
        hx-swap="outerHTML"
        hx-target="closest div"
      >
        Remove
      </button>
    </div>
  );
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div>
      {todos.map((todo) => (
        <TodoItem {...todo} />
      ))}
      <TodoForm />
    </div>
  );
}

function TodoForm() {
  return (
    <form
      class="flex flex-row space-x-3"
      hx-post="/todos"
      hx-swap="beforebegin"
    >
      <input
        class="shadow appearance-none border rounded w-full py-2 px-3 mr-4 text-grey-darker"
        type="text"
        name="content"
        class="border border-black"
      />
      <button
        class="flex-no-shrink p-2 border-2 rounded text-teal border-teal hover:text-white hover:bg-teal"
        type="submit"
      >
        Add
      </button>
    </form>
  );
}
