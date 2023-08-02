import { DuplicateNameError } from "../errors.mjs"
import { Modals } from "../modals.mjs"
import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
} from "discord.js"

type InferModalValues<
  T extends readonly unknown[],
  R extends object | unknown = unknown,
> = T extends readonly [infer TH, ...infer TT]
  ? InferModalValues<
      TT,
      TH extends ReturnType<typeof modalInput>
        ? TH["required"] extends true
          ? R & { [P in TH["id"]]: string }
          : R & { [P in TH["id"]]?: string }
        : R
    >
  : R

export function modalInput<T extends boolean, TT extends string>(
  id: TT,
  required: T,
  builder: TextInputBuilder,
) {
  builder.setCustomId(id).setRequired(required)
  return { id, required, builder }
}

// export function staticModal<
//   T extends string,
//   TT extends readonly ReturnType<typeof modalInput>[]
// >({
//   id,
//   title,
//   components,
//   handle,
// }: {
//   id: T
//   title: string
//   components: [...TT]
//   handle: (
//     interaction: ModalSubmitInteraction,
//     values: InferModalValues<TT>
//   ) => Promise<void>
// }) {
//   if (Modals.has(id)) {
//     throw new DuplicateNameError(id)
//   }

//   const modal = new ModalBuilder()
//     .setTitle(title)
//     .setCustomId(id)
//     .setComponents(
//       components.map((c) =>
//         new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
//           c.builder
//         )
//       )
//     )

//   Modals.set(id, async (interaction) => {
//     const values: Record<string, string> = {}
//     for (const row of interaction.components) {
//       for (const input of row.components) {
//         if (input.value === "") {
//           continue
//         }

//         values[input.customId] = input.value
//       }
//     }

//     await handle(interaction, values as InferModalValues<TT>)
//   })

//   return modal
// }

export function modal<
  T extends string,
  TT extends readonly ReturnType<typeof modalInput>[],
  TTT extends readonly string[],
>({
  id,
  title,
  components,
  handle,
}: {
  id: T
  title: string
  components: readonly [...TT]
  handle: (
    interaction: ModalSubmitInteraction,
    values: InferModalValues<TT>,
    ...args: [...TTT]
  ) => Promise<void>
}) {
  if (Modals.has(id)) {
    throw new DuplicateNameError(id)
  }

  Modals.set(id, async (interaction) => {
    const values: Record<string, string> = {}
    for (const row of interaction.components) {
      for (const input of row.components) {
        if (input.value === "") {
          continue
        }

        values[input.customId] = input.value
      }
    }

    await handle(
      interaction,
      values as InferModalValues<TT>,
      ...(interaction.customId.split(":").slice(1) as [...TTT]),
    )
  })

  function setupForm(
    defaults?: Partial<InferModalValues<TT>>,
    ...args: [...TTT]
  ) {
    return new ModalBuilder()
      .setTitle(title)
      .setCustomId(`${id}:${args.join(":")}`)
      .setComponents(
        components.map((c) => {
          const input = new TextInputBuilder(c.builder.data)
          if (defaults && c.id in defaults) {
            input.setValue((defaults as Record<string, string>)[c.id] as string)
          }

          return new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            input,
          )
        }),
      )
  }

  return setupForm
}
