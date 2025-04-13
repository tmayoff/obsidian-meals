<script lang="ts">
let { enabled = $bindable(false) } = $props();
</script>

<div
  class={["checkbox-container", enabled ? "is-enabled" : ""]}
  onclick={() => {
    enabled = !enabled;
  }}
>
  <input type="checkbox" tabindex="0" />
</div>
