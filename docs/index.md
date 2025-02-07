# Welcome to KJVonly

KJVonly is [source available](https://commonsclause.com/) software (i.e. always free of charge no matter where or who hosts the software) that adheres to software development best practices including SOLID principles, design patterns, DRY principle etc... This ensures the code base stays clean and future developers can easily maintain or extend the functionality.

## Project layout
```text
📦 lib - contains most of the code
┣ 📁 components - hold base components such as the pane component.
┣ 📁 db - IndexedDB databases.
┣ 📁 models - data structures. Pane being the most significant.
┣ 📁 services - services provide a single responsibility function.
┣ 📁 workers - web workers.

📦 routes
   ┗ 📄 +page.svelte - `/` route and only route.
```
 
  
       