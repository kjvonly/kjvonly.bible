# 3. Modules
`Module`s are any component to be displayed in a `Pane`. For example, the `Holy Bible` and `Search` are  `Module`s. Also the references (i.e. Strong's and Verse References) is a `Module`.

!!! note
    The `Holy Bible` is abstracted to a `chapter` in code


## Abstraction
With the `Pane` tree/node data structure, we can display `n` number of `Pane`s on the screen each containing a different `Module`, or the same module with different data (i.e. `Holy Bible` opened in 4 `Pane`s to 4 different chapters). This provides a very organic experience for the user. Extensibility wise, there is no limit to what `Module`s the app can have. All a developer will need to do is create the `Module` and add it to the `Modules` component (i.e. a `Module` that list the available `Module`s).

## Modules and the SRP
Modules should have one responsibility and do that responsibility well. For example, the `Holy Bible` `Module` responsibility is displaying the chapter contents to the user. Any addition responsibility is passed to another module such as search with the `Search` `Module`. This keeps the code clean and simple.
